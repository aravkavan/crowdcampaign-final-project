"""Iteration 4: with vs without CrowdCampaign, measured on real Upworthy A/B tests.

Without: the team runs the writer's own first idea (the earliest version written for the story).
With:    the team has several ideas and picks the best one; the pick is made on some readers and
         scored on the other readers, so luck is never counted as quality.

    python -m experiments.with_without
    python -m experiments.with_without path/to/file.csv

It prints and saves results/with_without.json with:
  - more ideas:   best of the first 2, 3, 4 ideas (stories with 4+), and 2..6 (stories with 6+)
  - testing size: best of 4 picked on 5%, 10% or half of the readers
All gains are "% more clicks than the writer's first idea". Tests the archive's authors flagged
(2013-06-25 to 2014-01-10) are left out, as in iteration 3. Standard library only, fixed seed.
"""
from __future__ import annotations

import argparse
import csv
import json
import random

from .upworthy import RESULTS_DIR, SAME_TOO, DataError, _normal_headline, fail, find_csv, in_flagged_window


def load_in_written_order(path, min_impressions: int) -> list[list[dict]]:
    """Stories with each idea's readers and clicks, ideas sorted by when they were written."""
    csv.field_size_limit(10**8)
    groups: dict = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.DictReader(fh)
        if "created_at" not in (reader.fieldnames or []):
            raise DataError("This file has no created_at column, so the first idea can't be found.")
        for i, row in enumerate(reader):
            if in_flagged_window(row.get("created_at")):
                continue
            try:
                n = int(float(row["impressions"] or 0)); c = int(float(row["clicks"] or 0))
            except ValueError:
                continue
            h = _normal_headline(row.get("headline"))
            if not h or n < min_impressions or c < 0 or c > n or not row["clickability_test_id"].strip():
                continue
            key = (row["clickability_test_id"].strip(), (row.get("eyecatcher_id") or "").strip(),
                   tuple(_normal_headline(row.get(col)) for col in SAME_TOO))
            g = groups.setdefault(key, {})
            rec = g.get(h.lower()); when = (row.get("created_at") or "", i)
            if rec:
                rec["n"] += n; rec["c"] += c; rec["when"] = min(rec["when"], when)
            else:
                g[h.lower()] = {"h": h, "n": n, "c": c, "when": when}
    return [sorted(g.values(), key=lambda r: r["when"]) for g in groups.values()]


def split(n: int, c: int, f: float, rnd: random.Random) -> tuple[float, float]:
    """Click rate among a random share f of the readers (used to pick) and among the rest (used to score)."""
    size = max(1, int(n * f))
    pc = sum(1 for spot in rnd.sample(range(n), c) if spot < size)
    return pc / size, (c - pc) / (n - size)


def run(stories, k_max: int, f: float, splits: int, rnd) -> list[list[float]]:
    """Per story: scored click rate of the first idea (index 1) and of the best of the first k (index k)."""
    per = []
    for s in stories:
        ideas = s[:k_max]
        tot = [0.0] * (k_max + 1)
        for _ in range(splits):
            parts = [split(r["n"], r["c"], f, rnd) for r in ideas]
            tot[1] += parts[0][1]
            for k in range(2, k_max + 1):
                order = list(range(k)); rnd.shuffle(order)
                pick = max(order, key=lambda j: parts[j][0])
                tot[k] += parts[pick][1]
        per.append([t / splits for t in tot])
    return per


def gains(per, k_max: int, idx=None):
    idx = list(range(len(per))) if idx is None else idx
    sums = [sum(per[i][k] for i in idx) for k in range(k_max + 1)]
    return {k: (sums[k] / sums[1] - 1) * 100 for k in range(2, k_max + 1)}, sums[1] / len(idx) * 1000


def ci(per, k_max: int, k: int, rounds: int = 1000):
    b = random.Random(11); vals = []
    for _ in range(rounds):
        idx = b.choices(range(len(per)), k=len(per))
        vals.append(gains(per, k_max, idx)[0][k])
    vals.sort()
    return round(vals[int(rounds * 0.025)], 1), round(vals[int(rounds * 0.975) - 1], 1)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m experiments.with_without", description=__doc__.splitlines()[0])
    parser.add_argument("csv", nargs="?", help="the Upworthy packages CSV (default: the one in experiments/data)")
    parser.add_argument("--min-impressions", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args(argv)
    try:
        path = find_csv(args.csv)
        print(f"Reading {path.name} ...", flush=True)
        stories = load_in_written_order(path, args.min_impressions)
    except DataError as err:
        return fail(str(err))

    rnd = random.Random(args.seed)
    out: dict = {}
    s4 = [s for s in stories if len(s) >= 4]
    print(f"More ideas: {len(s4):,} stories with 4+ ideas ...", flush=True)
    per = run(s4, 4, 0.5, 40, rnd)
    g, base = gains(per, 4)
    out["more_ideas_4"] = {"stories": len(s4), "first_idea_clicks_per_1000": round(base, 2),
                           "best_of_4_clicks_per_1000": round(base * (1 + g[4] / 100), 2),
                           "gain_pct": {k: round(v, 1) for k, v in g.items()}, "ci_best4": ci(per, 4, 4)}
    s6 = [s for s in stories if len(s) >= 6]
    print(f"More ideas: {len(s6):,} stories with 6+ ideas ...", flush=True)
    per6 = run(s6, 6, 0.5, 20, rnd)
    g6, _ = gains(per6, 6)
    out["more_ideas_6"] = {"stories": len(s6), "gain_pct": {k: round(v, 1) for k, v in g6.items()}, "ci_best6": ci(per6, 6, 6)}
    out["test_size"] = {}
    for f in (0.05, 0.10):
        print(f"Testing size: pick on {int(f * 100)}% of readers ...", flush=True)
        gf, _ = gains(run(s4, 4, f, 20, rnd), 4)
        out["test_size"][f"{int(f * 100)}%"] = round(gf[4], 1)
    out["test_size"]["50%"] = out["more_ideas_4"]["gain_pct"][4]

    RESULTS_DIR.mkdir(exist_ok=True)
    (RESULTS_DIR / "with_without.json").write_text(json.dumps(out, indent=1))
    m4 = out["more_ideas_4"]
    print(f"\nWithout (writer's first idea): {m4['first_idea_clicks_per_1000']} clicks per 1,000 readers")
    print(f"With (best of 4):              {m4['best_of_4_clicks_per_1000']}  ->  +{m4['gain_pct'][4]}% "
          f"(95% range +{m4['ci_best4'][0]}% to +{m4['ci_best4'][1]}%)")
    print("More ideas:", ", ".join(f"{k} ideas +{v}%" for k, v in m4["gain_pct"].items()),
          f"| 6 ideas +{out['more_ideas_6']['gain_pct'][6]}% ({out['more_ideas_6']['stories']} stories)")
    print("Testing size:", ", ".join(f"{k} of readers +{v}%" for k, v in out["test_size"].items()))
    print(f"Saved {RESULTS_DIR / 'with_without.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
