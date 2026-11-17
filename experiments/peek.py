"""Look at the data yourself: print one real story and its competing headline ideas.

    python -m experiments.peek              a random story (run it again for another)
    python -m experiments.peek --count 3    three random stories
    python -m experiments.peek --story 42   story number 42, the same one every time

Each story is one Upworthy test: the same article with several headline ideas, each shown
to its own real readers. In CrowdCampaign terms it is one campaign whose winner we already
know, because real readers decided it by clicking.
"""
from __future__ import annotations

import argparse
import random
import sys

from .upworthy import DataError, fail, find_csv, load_stories


def show(number: int, total: int, story) -> None:
    readers = sum(i.impressions for i in story.ideas)
    print(f"\nStory {number} of {total:,}: {len(story.ideas)} headline ideas, {readers:,} readers in total")
    print(f"  {'Clicked':>8}  {'Saw it':>7}  Headline idea")
    for idea in sorted(story.ideas, key=lambda i: -i.click_rate):
        mark = "   <- winner" if idea is story.best else ""
        print(f"  {idea.click_rate * 100:7.2f}%  {idea.impressions:>7,}  {idea.headline}{mark}")
    worst = min(story.ideas, key=lambda i: i.click_rate)
    if worst.click_rate > 0:
        print(f"  The winner was clicked {story.best.click_rate / worst.click_rate:.1f} times as often as the weakest idea.")


def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(errors="replace")  # headlines with unusual characters still print
    except AttributeError:
        pass
    parser = argparse.ArgumentParser(prog="python -m experiments.peek", description=__doc__.splitlines()[0])
    parser.add_argument("--count", type=int, default=1, help="how many random stories to show (default 1)")
    parser.add_argument("--story", type=int, help="show this story number instead of a random one")
    args = parser.parse_args(argv)
    try:
        stories, report = load_stories(find_csv())
    except DataError as err:
        return fail(str(err))
    total = len(stories)
    print(f"{report.rows:,} headline versions from {report.tests:,} real tests; "
          f"{total:,} stories where only the headline changed.")
    if args.story is not None:
        if not 1 <= args.story <= total:
            return fail(f"pick a story number from 1 to {total:,}.")
        picks = [args.story]
    else:
        picks = random.sample(range(1, total + 1), min(max(1, args.count), total))
    for number in picks:
        show(number, total, stories[number - 1])
    print("\nClicked = the share of people who saw that headline and clicked it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
