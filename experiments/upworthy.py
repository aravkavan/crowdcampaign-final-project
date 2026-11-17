"""Loading the Upworthy Research Archive and turning it into "stories".

In the archive, each row is one version (a "package") of a story's headline that was
shown to real readers, with how many saw it (impressions) and how many clicked.
Rows with the same clickability_test_id were tested against each other.

For CrowdCampaign a story is like one campaign: several people's ideas for the same
brief, and we know which idea really won. We only compare versions that used the same
image, excerpt, lede and share text, so the headline is the only thing that changed.
"""
from __future__ import annotations

import csv
import sys
from dataclasses import dataclass, field
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
RESULTS_DIR = Path(__file__).resolve().parent / "results"
REQUIRED = ("clickability_test_id", "headline", "impressions", "clicks", "eyecatcher_id")
# In 2024 the archive's authors said tests created in this window may not have been properly
# randomized (a web-cache problem), and asked causal analyses to leave them out.
FLAGGED_FROM, FLAGGED_TO = "2013-06-25", "2014-01-10"
SAME_TOO = ("excerpt", "lede", "share_text")  # must also match inside a story
DOWNLOAD_HELP = (
    "Download it from https://osf.io/jd64p/ (Files): the CSV whose name starts with\n"
    "  upworthy-archive-exploratory-packages\n"
    "and put it in the experiments/data folder."
)


class DataError(Exception):
    """A problem with the data file, explained in plain words."""


@dataclass
class Idea:
    headline: str
    impressions: int  # people who saw this version
    clicks: int  # people who clicked it

    @property
    def click_rate(self) -> float:
        return self.clicks / self.impressions


@dataclass
class Story:
    test_id: str
    image_id: str
    ideas: list = field(default_factory=list)

    @property
    def best(self) -> Idea:
        return max(self.ideas, key=lambda idea: idea.click_rate)


@dataclass
class LoadReport:
    path: Path
    rows: int = 0
    tests: int = 0
    skipped_problem: int = 0
    skipped_flagged: int = 0
    skipped_small: int = 0
    skipped_bad: int = 0
    stories: int = 0


def find_csv(given: str | None = None) -> Path:
    """The data file: the one given, or the CSV in experiments/data."""
    if given:
        path = Path(given)
        if not path.exists():
            raise DataError(f"Can't find {given}.")
        return path
    candidates = sorted(DATA_DIR.glob("*.csv"))
    if not candidates:
        raise DataError(f"No data file in {DATA_DIR}.\n{DOWNLOAD_HELP}")
    preferred = [p for p in candidates if "package" in p.name.lower()]
    return (preferred or candidates)[0]


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in ("true", "1", "yes", "t")


def _normal_headline(text: str) -> str:
    return " ".join(str(text or "").split())


def in_flagged_window(created_at: str | None) -> bool:
    """True for a version created in the window the archive's authors flagged (by date)."""
    day = str(created_at or "").strip()[:10]
    return FLAGGED_FROM <= day <= FLAGGED_TO


def load_stories(path: Path, min_impressions: int = 1000, skip_flagged: bool = False) -> tuple[list, LoadReport]:
    """Read the CSV and return the stories where only the headline changed.

    - rows flagged as part of the archive's known "problem" period are skipped;
    - a version shown to fewer than min_impressions people is skipped (its click rate is too noisy);
    - versions are grouped by test, image, excerpt, lede and share text, so within a story only
      the headline differs; the same headline twice is merged;
    - a story needs at least 2 different headlines.
    """
    report = LoadReport(path=path)
    csv.field_size_limit(10**8)
    groups: dict = {}
    tests = set()
    with open(path, newline="", encoding="utf-8", errors="replace") as handle:
        reader = csv.DictReader(handle)
        columns = {(name or "").strip().lower(): name for name in (reader.fieldnames or [])}
        missing = [c for c in REQUIRED if c not in columns]
        if missing:
            raise DataError(
                f"{path.name} doesn't look like the Upworthy packages file: it has no "
                f"{', '.join(missing)} column. Columns found: {', '.join(list(columns)[:12])}.\n{DOWNLOAD_HELP}"
            )
        problem_col = columns.get("problem")
        created_col = columns.get("created_at")
        if skip_flagged and not created_col:
            raise DataError(f"{path.name} has no created_at column, so the flagged dates can't be skipped.")
        for row in reader:
            report.rows += 1
            test_id = (row.get(columns["clickability_test_id"]) or "").strip()
            if not test_id:
                report.skipped_bad += 1
                continue
            tests.add(test_id)
            if problem_col and _truthy(row.get(problem_col)):
                report.skipped_problem += 1
                continue
            if skip_flagged and in_flagged_window(row.get(created_col)):
                report.skipped_flagged += 1
                continue
            try:
                impressions = int(float(row.get(columns["impressions"]) or 0))
                clicks = int(float(row.get(columns["clicks"]) or 0))
            except ValueError:
                report.skipped_bad += 1
                continue
            headline = _normal_headline(row.get(columns["headline"]))
            if not headline or impressions <= 0 or clicks < 0 or clicks > impressions:
                report.skipped_bad += 1
                continue
            if impressions < min_impressions:
                report.skipped_small += 1
                continue
            image_id = (row.get(columns["eyecatcher_id"]) or "").strip()
            # Everything else readers could see must match too, so only the headline differs.
            rest = tuple(_normal_headline(row.get(columns[c])) if c in columns else "" for c in SAME_TOO)
            story = groups.setdefault((test_id, image_id, rest), {})
            same = story.get(headline.lower())
            if same:
                same.impressions += impressions
                same.clicks += clicks
            else:
                story[headline.lower()] = Idea(headline, impressions, clicks)
    report.tests = len(tests)
    stories = [
        Story(test_id=t, image_id=i, ideas=list(ideas.values()))
        for (t, i, _rest), ideas in groups.items()
        if len(ideas) >= 2
    ]
    stories.sort(key=lambda s: (s.test_id, s.image_id))
    report.stories = len(stories)
    if not stories:
        raise DataError(f"No usable stories found in {path.name}. Is it the packages file?\n{DOWNLOAD_HELP}")
    return stories, report


def fail(message: str) -> int:
    print(f"\nStopped: {message}", file=sys.stderr)
    return 2
