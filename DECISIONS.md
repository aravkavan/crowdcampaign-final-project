# Decisions notepad

Short questions and answers for every big choice. Newest week at the bottom.

## Week of Nov 16 (demo build)

**Build inside the existing app, or a separate demo?**
Inside the app. It grows into the final product.

**Keep the market-intel tracker?**
Yes, inside this project: the Market intel page and a box on each campaign. "Find moments" (Nov 24) builds on its search.

**Split new code into small files?**
Yes. Every new feature lives in its own folder (`backend/src/features/...`, `frontend/src/features/...`). A fix changes one small file.

**Where do the brand card and the context card live?**
On the campaign (two new columns). One campaign = one brand + one moment.

**Brand card: does the AI search the web for the brand?**
Not yet. On Monday the AI drafts it from the brand name, the brief, and any "About us" text the organizer pastes in. Web search comes with "Find moments" (Nov 24).

**How are AI agents stored?**
Each agent is a special user account that can never log in (no usable password). That way each agent gives one idea per campaign, the same rule as people.

**One AI call per agent, or one call for all agents?**
One call per agent. Separate calls give more different ideas, which is the whole point of a crowd.

**How many agents per click?**
Up to 10 per click, picked to match the place and audience on the context card. 16 agents exist in total.

**Is the safety check AI or rules?**
Rules (fast, free, predictable) on Monday. It blocks real famous names, team and event trademarks, "official sponsor" claims, attempts to trick the AI judge, and swearing. It warns about tragedy, politics and religion, and anything on the brand's "never" list. An AI safety pass comes with the final check (Dec 1).

**Are blocked ideas deleted?**
No. They stay visible with the reason, but never enter the Top 10.

**When are images made?**
Only after a person picks the winner. 4 images in 4 styles, then the person picks one or presses Redo. Pictures never influence which idea wins.

**Which image tool?**
Cloudflare Workers AI, model FLUX.1 schnell (free daily allowance). Without a Cloudflare key, the app shows labelled placeholder cards so the demo never breaks.

**Where are images stored?**
In the database, so they survive restarts and moving computers.

**Do image links need a login?**
No. Each image has a long random id that cannot be guessed, so a plain `<img>` tag can show it.

**Does the AI ever pick the winner?**
No. Still only the organizer's "Pick as winner" button can set a winner.

**What if no AI key is set?**
Everything still works with clearly labelled offline versions (offline scores, sample agent ideas, placeholder images). Nothing pretends to be AI when it isn't.

**Preload the Messi-style demo campaign now (planned for Dec 8)?**
Yes, as demo data only, so Monday's demo runs in 2 minutes. It is a made-up juice brand and a pretend farewell match; no real names or logos.

**Re-check +20.9% without the flagged Upworthy tests?**
Yes. New script `experiments/recheck_flagged.py`. The old result stays as it was; the new number is reported next to it.

**Does the +20.9% hold without the flagged Upworthy tests?**
Yes. Re-run on Nov 15 without tests created June 25, 2013 to Jan 10, 2014 (4,278 of 22,666 versions left out): best of 4 ideas = **+21.7%** (95% range +20.4% to +23.2%) on 1,503 stories, vs +20.9% before. Same method, same seed.

**One command to run the app?**
Yes. `npm run setup` once, then `npm start` from the project folder. Two terminals still work too.

**Can the demo be reset for practice?**
Yes. `npm run reset-demo` puts the Taronja campaign back to its starting state. Nothing else is touched.

**Found while testing: the browser blocked saving the brand card.**
The server only allowed GET, POST, PATCH and DELETE from the browser. PUT was added to the allowed list.

**Nov 16 merge: did the new files overwrite the market-intel tracker?**
Yes, by accident (they were built on the Sep 28 A1 code). Fixed: the tracker tables, `/api/tracker` routes, Market intel page and nav link, its styles, the Loop Bottle demo campaign and the tracker part of the README are all back. `npm run check`: 51/51.

**Was `tracker/.env` safe?**
No. The copied `.gitignore` had lost the lines that keep `tracker/.env` (real keys), `.venv/` and `__pycache__/` out of git. Restored.

**Where does Market intel go on the campaign page?**
Below the 6 steps, so the flow stays first in the demo.

**How much text on screen?**
One short line per step. Long briefs and AI summaries show one line, with a "Show full brief" / "Read the idea" button. No screen asks you to run a command.

**Where is the +16% experiment?**
`python -m experiments.with_without` (iteration 4). Results in `experiments/results/with_without.json`.

**What is the project called?**
CrowdCampaign final project: folder and repo `crowdcampaign-final-project`. The tracker and the app are parts of it, not separate assignments.
