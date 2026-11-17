"""Iteration 3, step 1: re-check iteration 2 without the tests the archive's authors flagged.

In 2024 the Upworthy archive's authors published a correction: tests created between
June 25, 2013 and January 10, 2014 may not have been properly randomized, and they ask
causal analyses to leave them out. Our 2020 data file has no column marking them, so this
script leaves them out by date and runs iteration 2's exact method again.

    python -m experiments.recheck_flagged
    python -m experiments.recheck_flagged path/to/file.csv

It prints both numbers side by side and saves results/recheck_flagged.html, .svg and .json.
The original iteration 2 results are not touched.
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime
from html import escape

from .charts import lift_bars
from .crowd_effect import BOOTSTRAP_ROUNDS, SPLITS, bootstrap, fresh_readers_scores, gains, pct
from .upworthy import FLAGGED_FROM, FLAGGED_TO, RESULTS_DIR, DataError, fail, find_csv, load_stories


def measure(stories: list, max_ideas: int, seed: int) -> dict:
    """Iteration 2's method on one set of stories: gain of best-of-N over 1 idea, with 95% ranges."""
    rnd = random.Random(seed)
    usable = [s for s in stories if len(s.ideas) >= max_ideas]
    fresh = [fresh_readers_scores([(i.impressions, i.clicks) for i in s.ideas], max_ideas, SPLITS, rnd) for s in usable]
    real = gains(fresh)
    ranges = bootstrap(fresh, BOOTSTRAP_ROUNDS, rnd)
    rows = [
        {"ideas": n, "label": f"{n} ideas", "real": round(real[n - 2], 2),
         "low": round(ranges[n - 2][0], 2), "high": round(ranges[n - 2][1], 2)}
        for n in range(2, max_ideas + 1)
    ]
    return {"stories_compared": len(usable), "one_idea_click_rate": round(sum(r[0] for r in fresh) / len(fresh) * 100, 3), "rows": rows}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m experiments.recheck_flagged", description=__doc__.splitlines()[0])
    parser.add_argument("csv", nargs="?", help="the Upworthy packages CSV (default: the one in experiments/data)")
    parser.add_argument("--max-ideas", type=int, default=4)
    parser.add_argument("--min-impressions", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args(argv)

    try:
        path = find_csv(args.csv)
        print(f"Reading {path.name} twice: all tests, then without {FLAGGED_FROM} to {FLAGGED_TO} ...", flush=True)
        all_stories, all_report = load_stories(path, args.min_impressions)
        clean_stories, clean_report = load_stories(path, args.min_impressions, skip_flagged=True)
    except DataError as err:
        return fail(str(err))

    max_ideas = max(2, args.max_ideas)
    print("Measuring with all tests (this is iteration 2 again) ...", flush=True)
    before = measure(all_stories, max_ideas, args.seed)
    print("Measuring without the flagged tests ...", flush=True)
    after = measure(clean_stories, max_ideas, args.seed)
    if after["stories_compared"] < 30:
        return fail(f"only {after['stories_compared']} stories are left; too few to measure.")

    b, a = before["rows"][-1], after["rows"][-1]
    print()
    print("Iteration 3, step 1: does the iteration 2 result hold without the flagged tests?")
    print()
    print(f"  Versions skipped because of the flagged dates: {clean_report.skipped_flagged:,} of {clean_report.rows:,}")
    print(f"  {'':<26}{'Stories':>9}{'Best of 2':>12}{'Best of 3':>12}{'Best of 4':>12}   95% range (best of {max_ideas})")
    for name, res in (("All tests (iteration 2)", before), ("Without flagged dates", after)):
        gains_text = "".join(f"{pct(r['real']):>12}" for r in res["rows"])
        top = res["rows"][-1]
        print(f"  {name:<26}{res['stories_compared']:>9,}{gains_text}   {pct(top['low'])} to {pct(top['high'])}")
    print()
    overlap = a["low"] <= b["high"] and b["low"] <= a["high"]
    verdict = "holds" if a["low"] > 0 and overlap else ("changes" if a["low"] > 0 else "does not hold")
    print(f"Result: without the flagged tests, the best of {max_ideas} ideas gets {pct(a['real'])} more clicks "
          f"(95% range {pct(a['low'])} to {pct(a['high'])}), compared with {pct(b['real'])} before. The finding {verdict}.")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        "iteration": 3, "step": "re-check without flagged dates",
        "run_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "data_file": path.name, "flagged_window": [FLAGGED_FROM, FLAGGED_TO],
        "versions_skipped": clean_report.skipped_flagged, "versions_total": clean_report.rows,
        "settings": {"max_ideas": max_ideas, "min_impressions": args.min_impressions, "seed": args.seed},
        "all_tests": before, "without_flagged": after, "verdict": verdict,
    }
    (RESULTS_DIR / "recheck_flagged.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    chart_rows = [{**r, "luck": o["real"]} for r, o in zip(after["rows"], before["rows"])]
    chart = lift_bars(
        chart_rows,
        f"Without the flagged tests: best of {max_ideas} ideas = {pct(a['real'])} clicks",
        f"{after['stories_compared']:,} stories after leaving out {FLAGGED_FROM} to {FLAGGED_TO}",
        real_label="Without flagged dates (line = 95% range)",
        luck_label="All tests (iteration 2)",
    )
    (RESULTS_DIR / "recheck_flagged.svg").write_text(chart, encoding="utf-8")
    (RESULTS_DIR / "recheck_flagged.html").write_text(_html(data, chart, max_ideas), encoding="utf-8")
    print()
    print("Saved: experiments/results/recheck_flagged.html (open it in your browser), .svg and .json")
    return 0


def _html(data: dict, chart: str, max_ideas: int) -> str:
    def row(name: str, res: dict) -> str:
        cells = "".join(f"<td>{pct(r['real'])}</td>" for r in res["rows"])
        top = res["rows"][-1]
        return f"<tr><td>{name}</td><td>{res['stories_compared']:,}</td>{cells}<td>{pct(top['low'])} to {pct(top['high'])}</td></tr>"

    heads = "".join(f"<th>Best of {r['ideas']}</th>" for r in data["all_tests"]["rows"])
    a = data["without_flagged"]["rows"][-1]
    b = data["all_tests"]["rows"][-1]
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Iteration 3: re-check without flagged tests</title>
<style>
body {{ font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; color: #17163b; background: #f6f7fb; margin: 0; }}
main {{ max-width: 820px; margin: 0 auto; padding: 32px 20px 48px; }}
h1 {{ font-size: 1.6rem; margin: 0 0 6px; }} h2 {{ font-size: 1.1rem; margin: 28px 0 8px; }}
.answer {{ font-size: 1.1rem; background: #fff; border-left: 4px solid #2a36e8; padding: 12px 16px; border-radius: 8px; }}
svg {{ width: 100%; height: auto; background: #fff; border-radius: 12px; margin-top: 12px; }}
table {{ width: 100%; border-collapse: collapse; background: #fff; font-size: .95rem; }}
th, td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid #e3e5ef; }} th {{ background: #eef0f7; }}
.scroll {{ overflow-x: auto; }} .muted {{ color: #5f6180; }}
</style></head><body><main>
<p class="muted">CrowdCampaign final project · iteration 3, step 1 · run {escape(data['run_at'])}</p>
<h1>Does the +gain hold without the flagged tests?</h1>
<p class="answer">Without the tests created from {FLAGGED_FROM} to {FLAGGED_TO}, the best of {max_ideas} ideas gets
<b>{pct(a['real'])}</b> more clicks than one idea (95% range {pct(a['low'])} to {pct(a['high'])}), compared with {pct(b['real'])}
with all tests. The finding <b>{escape(data['verdict'])}</b>.</p>
{chart}
<h2>The numbers</h2>
<div class="scroll"><table><tr><th>Data</th><th>Stories</th>{heads}<th>95% range (best of {max_ideas})</th></tr>
{row('All tests (iteration 2)', data['all_tests'])}{row('Without flagged dates', data['without_flagged'])}</table></div>
<h2>Why this re-check</h2>
<p>In 2024 the archive's authors published a correction: tests created between {FLAGGED_FROM} and {FLAGGED_TO} may not have
been properly randomized (a web cache served one version at a time), and they ask causal analyses to leave them out. Our data
file is from 2020 and has no column marking them, so they were left out by their creation date:
{data['versions_skipped']:,} of {data['versions_total']:,} headline versions. Everything else is iteration 2's exact method and seed.</p>
<p class="muted">Data: J. N. Matias, K. Munger, M. Aubin Le Quere and C. Ebersole, The Upworthy Research Archive, Scientific Data 8, 2021
(author correction 2024). CC BY 4.0. Created with python -m experiments.recheck_flagged.</p>
</main></body></html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
