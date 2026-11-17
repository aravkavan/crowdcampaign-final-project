# CrowdCampaign final project: experiments

CrowdCampaign's idea is that anyone can give an idea, an AI shortlists them, and a person picks
the winner. The final project tests that idea on real data and improves it in measured steps.

The data is the Upworthy Research Archive: thousands of real tests in which several headlines were
written for the same story and shown to real readers, with the number who clicked each one. Each
test is like one CrowdCampaign campaign whose real winner we already know. See `data/README.md`
for the download.

## Iterations

| # | Date | Question | Command | Results |
| --- | --- | --- | --- | --- |
| 1 | Oct 20 | A market-intel agent that tracks current trends per campaign | `python -m tracker run` | `reports/` |
| 2 | Oct 27 | Do more ideas give a better winner? | `python -m experiments.crowd_effect` | `results/crowd_effect.html` |
| 3 | Nov 15 | Does that still hold without the tests the archive's authors flagged? | `python -m experiments.recheck_flagged` | `results/recheck_flagged.html` |
| 4 | Nov 15 | With vs without CrowdCampaign: best of N ideas vs the writer's own first idea | `python -m experiments.with_without` | `results/with_without.json` |

Every command is run from the project folder (the one with `config.yaml`) and uses only Python's
standard library, so nothing new needs installing. Every run uses a fixed random seed, so it gives
the same numbers each time.

To look at the raw data yourself: `python -m experiments.peek` prints a random story with its
competing headlines and how often each was clicked (`--story 2431` shows the same one every time).

## How iteration 2 measures "better"

Each idea's readers are split at random into two halves. The winner among N ideas is picked using one
half and scored on the other half, so the score comes from readers who played no part in choosing it.
Picking and scoring on the same readers would count the winner's lucky streak as quality (the
"winner's curse") and overstate the gain. As a check, the same method is run on copies of the data in
which every idea is equally good; it gives about 0%, so the measured gain is not luck.

## Progress log

`LOG.md` has one short entry per iteration: what was run, what it showed, and what was decided next.
