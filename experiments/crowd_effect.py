"""Iteration 2: do more ideas give a better winner?

CrowdCampaign's whole idea is that anyone can give an idea. This checks, on real data,
whether choosing the best of several ideas gets more clicks than having just one.

    python -m experiments.crowd_effect                (uses the CSV in experiments/data)
    python -m experiments.crowd_effect path/to/file.csv

How it works, in plain words:
  1. Each story in the archive had several headline ideas, each shown to its own real readers.
  2. Each idea's readers are split at random into two halves: a "pick" half and a "check" half.
  3. "Best of N": for every possible group of N ideas, the winner is the idea with the highest
     click rate in the pick half, and it is scored by its click rate in the check half, readers
     who played no part in choosing it. This is averaged over every group of N, and over 40
     different random splits.
  4. "1 idea" is the average click rate in the check half: what you'd get with a single idea.
  5. The gain is how much higher "best of N" is than "1 idea", over all stories.
  6. The 95% range comes from re-running step 5 on 1,000 random re-samples of the stories.
  7. No-difference check: the same steps on a copy of the data where every idea in a story is
     equally good (clicks redrawn at random from the story's overall rate). It should come out
     near 0%, which shows the method isn't fooled by luck.

Why split the readers? If the same readers both pick and score the winner, its lucky streak is
counted as quality, and the gain looks bigger than it is (the "winner's curse"). That inflated
number is shown too, for comparison.
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime
from html import escape
from math import comb, sqrt

from .charts import lift_bars
from .upworthy import RESULTS_DIR, DataError, fail, find_csv, load_stories

SPLITS = 40  # random pick/check splits per story
CHECK_ROUNDS = 3  # copies of the data with all ideas equally good
CHECK_SPLITS = 10  # splits per copy (the check only needs to land near 0)
BOOTSTRAP_ROUNDS = 1000


def pct(value: float) -> str:
    """A signed percentage with one decimal, without the odd-looking "-0.0%"."""
    return f"{round(value, 1) + 0.0:+.1f}%"


# ---------------------------------------------------------------- the maths, one small step each
def expected_best(sorted_rates: list, n: int) -> float:
    """Average of the best value, over every possible group of n values.

    With the values sorted from lowest to highest, value i is the best of a group when the
    other n-1 values all come from the i values below it: comb(i, n-1) of the comb(k, n) groups.
    """
    k = len(sorted_rates)
    return sum(sorted_rates[i] * comb(i, n - 1) for i in range(n - 1, k)) / comb(k, n)


def same_readers_scores(rates: list, max_ideas: int) -> list:
    """[1 idea, best of 2, ..., best of max] when the same readers pick and score (includes luck)."""
    ordered = sorted(rates)
    return [expected_best(ordered, n) for n in range(1, max_ideas + 1)]


def split_readers(impressions: int, clicks: int, rnd: random.Random) -> tuple:
    """Split one idea's readers at random into two halves; return (pick-half rate, check-half rate).

    The clickers are placed at random positions among all readers; those in the first half
    belong to the pick half. This is an exact random split, not an approximation.
    """
    pick_size = impressions // 2
    pick_clicks = sum(1 for spot in rnd.sample(range(impressions), clicks) if spot < pick_size)
    return pick_clicks / pick_size, (clicks - pick_clicks) / (impressions - pick_size)


def fresh_readers_scores(ideas: list, max_ideas: int, splits: int, rnd: random.Random) -> list:
    """[1 idea, best of 2, ..., best of max] for one story, picked on one half, scored on the other.

    ideas: [(impressions, clicks), ...]
    """
    k = len(ideas)
    totals = [0.0] * max_ideas
    for _ in range(splits):
        halves = [split_readers(n, c, rnd) for n, c in ideas]
        order = list(range(k))
        rnd.shuffle(order)  # so exact ties in the pick half are broken at random
        order.sort(key=lambda i: halves[i][0])  # lowest pick-half rate first
        check = [halves[i][1] for i in order]  # check-half rates in that order
        for n in range(1, max_ideas + 1):
            totals[n - 1] += sum(check[r] * comb(r, n - 1) for r in range(n - 1, k)) / comb(k, n)
    return [total / splits for total in totals]


def gains(scores: list, picks=None) -> list:
    """Percent gain of best-of-N over 1 idea, for N = 2..max, over the chosen stories."""
    picks = range(len(scores)) if picks is None else picks
    totals = None
    for index in picks:
        row = scores[index]
        totals = list(row) if totals is None else [a + b for a, b in zip(totals, row)]
    return [(total / totals[0] - 1) * 100 for total in totals[1:]]


def bootstrap(scores: list, rounds: int, rnd: random.Random) -> list:
    """95% range for each gain: recompute it on re-sampled sets of stories."""
    count = len(scores)
    draws = [gains(scores, rnd.choices(range(count), k=count)) for _ in range(rounds)]
    ranges = []
    for i in range(len(draws[0])):
        values = sorted(d[i] for d in draws)
        ranges.append((values[int(0.025 * rounds)], values[int(0.975 * rounds) - 1]))
    return ranges


def all_equal_copy(stories: list, rnd: random.Random) -> list:
    """A copy of the data where every idea in a story is exactly as good as the others.

    Each idea keeps its real number of readers; its clicks are redrawn at random from the
    story's overall click rate (a binomial draw, approximated by a normal one).
    """
    copy = []
    for story in stories:
        shown = sum(i.impressions for i in story.ideas)
        rate = sum(i.clicks for i in story.ideas) / shown
        fake = []
        for idea in story.ideas:
            n = idea.impressions
            clicks = round(n * rate + rnd.gauss(0, 1) * sqrt(n * rate * (1 - rate)))
            fake.append((n, min(n, max(0, clicks))))
        copy.append(fake)
    return copy


# ---------------------------------------------------------------- the run
def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m experiments.crowd_effect", description=__doc__.splitlines()[0])
    parser.add_argument("csv", nargs="?", help="the Upworthy packages CSV (default: the one in experiments/data)")
    parser.add_argument("--max-ideas", type=int, default=4, help="compare 1 idea with the best of up to this many (default 4)")
    parser.add_argument("--min-impressions", type=int, default=1000, help="skip versions seen by fewer people (default 1000)")
    parser.add_argument("--seed", type=int, default=7, help="random seed, so every run gives the same numbers")
    args = parser.parse_args(argv)

    try:
        path = find_csv(args.csv)
        print(f"Reading {path.name} ...", flush=True)
        stories, report = load_stories(path, args.min_impressions)
    except DataError as err:
        return fail(str(err))

    max_ideas = max(2, args.max_ideas)
    usable = [s for s in stories if len(s.ideas) >= max_ideas]
    while len(usable) < 100 and max_ideas > 2:
        max_ideas -= 1
        usable = [s for s in stories if len(s.ideas) >= max_ideas]
    if len(usable) < 30:
        return fail(f"only {len(usable)} stories have {max_ideas} or more headline ideas; that's too few to measure.")

    rnd = random.Random(args.seed)
    print(f"Comparing {len(usable):,} stories: splitting readers {SPLITS} times per story ...", flush=True)
    fresh = [fresh_readers_scores([(i.impressions, i.clicks) for i in s.ideas], max_ideas, SPLITS, rnd) for s in usable]
    fresh_gain = gains(fresh)
    ranges = bootstrap(fresh, BOOTSTRAP_ROUNDS, rnd)

    print("No-difference check: the same steps on copies where every idea is equally good ...", flush=True)
    check_runs = []
    for _ in range(CHECK_ROUNDS):
        copy = all_equal_copy(usable, rnd)
        check_runs.append(gains([fresh_readers_scores(ideas, max_ideas, CHECK_SPLITS, rnd) for ideas in copy]))
    check = [sum(run[i] for run in check_runs) / CHECK_ROUNDS for i in range(max_ideas - 1)]

    same = gains([same_readers_scores([i.click_rate for i in s.ideas], max_ideas) for s in usable])
    base_rate = sum(row[0] for row in fresh) / len(fresh) * 100
    best_rates = [sum(row[n] for row in fresh) / len(fresh) * 100 for n in range(max_ideas)]
    example = max(rnd.sample(usable, min(25, len(usable))), key=lambda s: sum(i.impressions for i in s.ideas))

    rows = []
    for n in range(2, max_ideas + 1):
        low, high = ranges[n - 2]
        rows.append({
            "ideas": n, "label": f"{n} ideas", "best_click_rate": round(best_rates[n - 1], 3),
            "real": round(fresh_gain[n - 2], 2), "low": round(low, 2), "high": round(high, 2),
            "luck": round(check[n - 2], 2), "same_readers": round(same[n - 2], 2),
        })
    top = rows[-1]
    beats_luck = top["low"] > top["luck"]

    # ---------------------------------------------------------------- what you see in the terminal
    print()
    print("CrowdCampaign final project, iteration 2: do more ideas give a better winner?")
    print()
    print(f"Data: {path.name}")
    print(f"  {report.rows:,} headline versions in {report.tests:,} tests")
    print(f"  skipped: {report.skipped_problem:,} from the archive's known problem period, "
          f"{report.skipped_small:,} seen by fewer than {args.min_impressions:,} people, {report.skipped_bad:,} unreadable")
    print(f"  {report.stories:,} stories where only the headline changed")
    print(f"  {len(usable):,} of them have {max_ideas} or more ideas: those are compared below")
    print()
    print("  Winner picked with half of each idea's readers, scored on the other half:")
    print(f"  {'Ideas to choose from':<22}{'Winner click rate':>19}{'Gain vs 1 idea':>17}{'95% range':>22}{'If all equal':>15}")
    print(f"  {'1 idea':<22}{base_rate:>18.3f}%{'-':>17}{'':>22}{'':>15}")
    for row in rows:
        span = f"{pct(row['low'])} to {pct(row['high'])}"
        print(f"  {row['label']:<22}{row['best_click_rate']:>18.3f}%{pct(row['real']):>17}"
              f"{span:>22}{pct(row['luck']):>15}")
    print()
    print(f"Result: the best of {max_ideas} ideas got {pct(top['real'])} more clicks than a single idea, measured on")
    print(f"readers who weren't used to pick it (95% range {pct(top['low'])} to {pct(top['high'])}).")
    print(f"If all ideas were equally good, the same method gives {pct(top['luck'])}, so the gain is real, not luck.")
    print(f"(Picking and scoring on the same readers would show {pct(top['same_readers'])}: that extra part is the")
    print(" winner's lucky streak, which is why the readers are split.)")
    if not beats_luck:
        print("Careful: the gain is not clearly above the no-difference check in this data. Say that honestly in class.")
    print()
    print("A real story from the data (each line was shown to its own real readers):")
    for idea in sorted(example.ideas, key=lambda i: -i.click_rate):
        mark = "  <- winner" if idea is example.best else ""
        print(f"  {idea.click_rate * 100:5.2f}% clicked  ({idea.impressions:,} saw it)  {idea.headline[:80]}{mark}")

    # ---------------------------------------------------------------- saved results
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().astimezone().isoformat(timespec="seconds")
    data = {
        "iteration": 2, "question": "Do more ideas give a better winner?", "run_at": stamp,
        "data_file": path.name,
        "settings": {"max_ideas": max_ideas, "min_impressions": args.min_impressions, "seed": args.seed,
                     "splits": SPLITS, "bootstrap_rounds": BOOTSTRAP_ROUNDS,
                     "check_rounds": CHECK_ROUNDS, "check_splits": CHECK_SPLITS},
        "counts": {"rows": report.rows, "tests": report.tests, "skipped_problem": report.skipped_problem,
                   "skipped_small": report.skipped_small, "skipped_bad": report.skipped_bad,
                   "stories": report.stories, "stories_compared": len(usable)},
        "one_idea_click_rate": round(base_rate, 3),
        "results": rows,
        "columns": {"real": "gain vs 1 idea, winner scored on fresh readers (%)",
                    "low/high": "95% range of that gain",
                    "luck": "the same method when all ideas are equally good (%)",
                    "same_readers": "gain if the same readers pick and score, includes luck (%)"},
        "example_story": [{"headline": i.headline, "impressions": i.impressions, "clicks": i.clicks}
                          for i in sorted(example.ideas, key=lambda i: -i.click_rate)],
    }
    (RESULTS_DIR / "crowd_effect.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    chart = lift_bars(
        rows,
        f"The best of {max_ideas} ideas gets {top['real']:.0f}% more clicks than one idea",
        f"{len(usable):,} real stories; winners picked on half the readers, scored on the other half",
        real_label="Real data (line = 95% range)",
        luck_label="If all ideas were equally good",
    )
    (RESULTS_DIR / "crowd_effect.svg").write_text(chart, encoding="utf-8")
    (RESULTS_DIR / "crowd_effect.html").write_text(_html(data, chart, top, max_ideas, beats_luck), encoding="utf-8")
    print()
    print("Saved: experiments/results/crowd_effect.html (double-click it to open in your browser),")
    print("       experiments/results/crowd_effect.svg (the chart) and crowd_effect.json (all the numbers).")
    return 0


def _html(data: dict, chart: str, top: dict, max_ideas: int, beats_luck: bool) -> str:
    counts = data["counts"]
    settings = data["settings"]
    table = "".join(
        f"<tr><td>{r['label']}</td><td>{r['best_click_rate']:.3f}%</td><td><b>{pct(r['real'])}</b></td>"
        f"<td>{pct(r['low'])} to {pct(r['high'])}</td><td>{pct(r['luck'])}</td><td>{pct(r['same_readers'])}</td></tr>"
        for r in data["results"]
    )
    story = "".join(
        f"<tr><td>{escape(s['headline'])}</td><td>{s['clicks'] / s['impressions'] * 100:.2f}%</td>"
        f"<td>{s['impressions']:,}</td></tr>"
        for s in data["example_story"]
    )
    caution = "" if beats_luck else (
        "<p class='warn'>The gain is not clearly above the no-difference check in this data. Report that honestly.</p>")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Iteration 2: more ideas, better winner</title>
<style>
body {{ font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; color: #17163b; background: #f6f7fb; margin: 0; }}
main {{ max-width: 820px; margin: 0 auto; padding: 32px 20px 48px; }}
h1 {{ font-size: 1.6rem; margin: 0 0 6px; }} h2 {{ font-size: 1.1rem; margin: 28px 0 8px; }}
.answer {{ font-size: 1.1rem; background: #fff; border-left: 4px solid #2a36e8; padding: 12px 16px; border-radius: 8px; }}
.warn {{ background: #fff1c7; padding: 10px 14px; border-radius: 8px; }}
svg {{ width: 100%; height: auto; background: #fff; border-radius: 12px; margin-top: 12px; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; font-size: .95rem; }}
th, td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid #e3e5ef; vertical-align: top; }}
th {{ background: #eef0f7; }} .scroll {{ overflow-x: auto; }} td {{ overflow-wrap: anywhere; }} small, .muted {{ color: #5f6180; }}
</style></head><body><main>
<p class="muted">CrowdCampaign final project · iteration 2 · run {escape(data['run_at'])}</p>
<h1>Do more ideas give a better winner?</h1>
<p class="answer">{'Yes' if beats_luck else 'Not clearly'}: on {counts['stories_compared']:,} real stories, picking the best of {max_ideas} headline ideas
got <b>{pct(top['real'])}</b> more clicks than using a single idea, measured on readers who weren't used to pick it
(95% range {pct(top['low'])} to {pct(top['high'])}). If every idea were equally good, the same method gives {pct(top['luck'])},
so the gain comes from real differences between ideas, not luck.</p>
{caution}
{chart}
<h2>The numbers</h2>
<div class="scroll"><table><tr><th>Ideas to choose from</th><th>Winner's click rate (fresh readers)</th><th>Gain vs 1 idea</th><th>95% range</th><th>If all ideas were equally good</th><th>Same readers pick and score (includes luck)</th></tr>
<tr><td>1 idea</td><td>{data['one_idea_click_rate']:.3f}%</td><td>-</td><td></td><td></td><td></td></tr>{table}</table></div>
<h2>One real story from the data</h2>
<p class="muted">The same story, several headline ideas, each shown to its own real readers. The top one won.</p>
<div class="scroll"><table><tr><th>Headline idea</th><th>Clicked</th><th>People who saw it</th></tr>{story}</table></div>
<h2>How this was measured</h2>
<p>Data: the Upworthy Research Archive, {counts['rows']:,} headline versions from {counts['tests']:,} real tests (2013 to 2015).
Only versions with the same image, excerpt, lede and share text were compared, so the headline is the only difference;
versions seen by fewer than {settings['min_impressions']:,} people were left out.</p>
<p>Each idea's readers were split at random into two halves. The winner of every possible group of N ideas was chosen by its
click rate in one half and scored by its click rate in the other half, so the score comes from readers who played no part in
choosing it. This was repeated with {settings['splits']} different random splits. "1 idea" is the average click rate of a
story's ideas. The 95% range comes from {settings['bootstrap_rounds']:,} re-samples of the stories. "If all ideas were equally
good" runs the same steps on copies of the data where every idea's clicks are redrawn from its story's overall rate; it should
be close to 0%. The last column picks and scores on the same readers, which counts the winner's lucky streak as quality
(the "winner's curse"), so it is bigger than the honest number.</p>
<p><small>Data: J. N. Matias, K. Munger, M. Aubin Le Quere and C. Ebersole, The Upworthy Research Archive, Scientific Data 8, 2021.
Licensed CC BY 4.0. Created with python -m experiments.crowd_effect (seed {settings['seed']}).</small></p>
</main></body></html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
