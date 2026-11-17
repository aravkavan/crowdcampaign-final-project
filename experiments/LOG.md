# Final project log

One entry per iteration, in my own words: what I ran, what I saw, what I decided.
Three lines each. This log becomes the backbone of the final report.

## Iteration 1 (week of Oct 20): a market-intel agent

- **Ran:** `python -m tracker run`, twice, at least a day apart.
- **Saw:** [what the tracker found for the campaigns, and what was new on the second run]
- **Decided:** [for example: keep it to 3 campaigns, run by hand, so the cost stays fixed]

## Iteration 2 (week of Oct 27): do more ideas give a better winner?

- **Ran:** `python -m experiments.peek` and `python -m experiments.crowd_effect`
- **Saw:** [the main number, and one thing that surprised you]
- **Decided:** [what it means for CrowdCampaign, for example: a campaign should collect at least 4 ideas before judging]

## Iteration 3 (Nov 15): does the result hold without the flagged tests?

- **Ran:** `python -m experiments.recheck_flagged`
- **Saw:** [for example: best of 4 went from +20.9% to +21.7% with the flagged tests removed (1,503 stories), so it holds]
- **Decided:** [for example: always leave the flagged dates out from now on]

## Iteration 4 (Nov 15): with vs without CrowdCampaign

- **Ran:** `python -m experiments.with_without`
- **Saw:** [for example: best of 4 beats the writer's first idea by +16% (12.0 → 13.8 clicks per 1,000 readers); a tiny 5% test gives only +6%]
- **Decided:** [for example: next, measure how close the AI judge gets to a real reader test]
