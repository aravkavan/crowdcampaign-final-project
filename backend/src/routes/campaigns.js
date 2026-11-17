// Campaigns, ideas (submissions) and picking a winner. Every route needs a login.
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/requireAuth.js';
import { HttpError, bodyOf } from '../lib/http.js';
import { isUuid, lengthProblem, text } from '../lib/validate.js';
import { rankedSubmissions } from '../services/submissions.js';
import { agentDetails } from '../features/agents/personas.js';
import { isAdmin } from '../features/shared/admin.js';

export const campaignsRouter = Router();

// Status is worked out from the data instead of stored, so it can never go stale.
//   open             accepting ideas
//   judging          deadline passed, no winner yet
//   winner_selected  the organizer picked a winner (can be undone)
function campaignStatus(row, now = Date.now()) {
  if (row.has_winner) return 'winner_selected';
  if (new Date(row.deadline).getTime() <= now) return 'judging';
  return 'open';
}

// $1 is always the id of the person asking.
const CAMPAIGN_COLUMNS = `
  c.id, c.brand, c.title, c.brief, c.prize, c.deadline, c.created_at, c.brand_card, c.context, c.score_factors,
  c.organizer_id, u.username AS organizer_username,
  (SELECT count(*)::int FROM submissions s WHERE s.campaign_id = c.id) AS submission_count,
  EXISTS (SELECT 1 FROM submissions s WHERE s.campaign_id = c.id AND s.is_winner) AS has_winner,
  EXISTS (SELECT 1 FROM submissions s WHERE s.campaign_id = c.id AND s.author_id = $1) AS has_submitted,
  EXISTS (SELECT 1 FROM submissions s WHERE s.campaign_id = c.id AND s.author_id = $1 AND s.is_winner) AS you_won`;

// `viewer` is the logged-in user (or just their id). Organizers manage their own campaigns;
// the admin account (the grader) can manage every campaign.
function shapeCampaign(row, viewer) {
  const viewerId = typeof viewer === 'object' ? viewer?.id : viewer;
  const owner = row.organizer_id === viewerId;
  const admin = typeof viewer === 'object' && isAdmin(viewer);
  return {
    id: row.id,
    brand: row.brand,
    title: row.title,
    brief: row.brief,
    prize: row.prize,
    deadline: row.deadline,
    created_at: row.created_at,
    brand_card: row.brand_card ?? null,
    context: row.context ?? null,
    score_factors: row.score_factors ?? [],
    organizer: { id: row.organizer_id, username: row.organizer_username },
    submission_count: row.submission_count,
    status: campaignStatus(row),
    is_organizer: owner,
    can_manage: owner || admin,
    managed_as_admin: !owner && admin,
    has_submitted: row.has_submitted,
    you_won: row.you_won,
  };
}

// One campaign as seen by `viewer`, or a 404.
export async function loadCampaign(id, viewer) {
  if (!isUuid(id)) throw new HttpError(404, 'Campaign not found.');
  const viewerId = typeof viewer === 'object' ? viewer?.id : viewer;
  const { rows } = await query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns c JOIN users u ON u.id = c.organizer_id WHERE c.id = $2`,
    [viewerId, id],
  );
  if (!rows[0]) throw new HttpError(404, 'Campaign not found.');
  return shapeCampaign(rows[0], viewer);
}

export function requireOrganizer(campaign) {
  if (!campaign.can_manage) throw new HttpError(403, 'Only this campaign’s organizer can do that.');
}

function shapeIdea(row) {
  const agent = row.agent_profile;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    is_winner: row.is_winner,
    created_at: row.created_at,
    origin: row.origin ?? 'human',
    author: {
      id: row.author_id,
      username: row.author_username,
      agent: agentDetails(agent),
    },
  };
}

// The campaign plus the viewer's own idea and, once picked, the winning idea.
// Nobody but the organizer sees the other ideas.
export async function campaignDetail(id, viewer) {
  const campaign = await loadCampaign(id, viewer);
  const viewerId = typeof viewer === 'object' ? viewer?.id : viewer;
  const { rows } = await query(
    `SELECT s.id, s.title, s.content, s.is_winner, s.created_at, s.origin, s.author_id,
            u.username AS author_username, u.agent_profile
       FROM submissions s JOIN users u ON u.id = s.author_id
      WHERE s.campaign_id = $1 AND (s.author_id = $2 OR s.is_winner)`,
    [campaign.id, viewerId],
  );
  const mine = rows.find((row) => row.author_id === viewerId);
  const winner = rows.find((row) => row.is_winner);
  // The picture the organizer chose for the winning idea, if any.
  const { rows: chosen } = await query('SELECT id FROM idea_images WHERE campaign_id = $1 AND chosen', [campaign.id]);
  return {
    ...campaign,
    my_submission: mine ? shapeIdea(mine) : null,
    winner: winner ? shapeIdea(winner) : null,
    winner_image: chosen[0] ? `/api/images/${chosen[0].id}` : null,
  };
}

// GET /api/campaigns -> { campaigns: [...] }, newest first
campaignsRouter.get('/', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns c JOIN users u ON u.id = c.organizer_id
      ORDER BY c.created_at DESC LIMIT 200`,
    [req.user.id],
  );
  res.json({ campaigns: rows.map((row) => shapeCampaign(row, req.user)) });
});

// POST /api/campaigns  { brand, title, brief, prize, deadline }  -> 201 campaign
campaignsRouter.post('/', requireAuth, async (req, res) => {
  const body = bodyOf(req);
  const brand = text(body.brand);
  const title = text(body.title);
  const brief = text(body.brief);
  const prize = text(body.prize);
  const problem =
    lengthProblem('Brand name', brand, 2, 80) ??
    lengthProblem('Title', title, 5, 120) ??
    lengthProblem('Brief', brief, 40, 4000) ??
    lengthProblem('Prize', prize, 2, 120);
  if (problem) throw new HttpError(400, problem);

  const deadline = new Date(typeof body.deadline === 'string' ? body.deadline : Number.NaN);
  if (Number.isNaN(deadline.getTime())) {
    throw new HttpError(400, 'Deadline must be a date and time, like 2026-10-31T17:00:00Z.');
  }
  if (deadline.getTime() <= Date.now()) throw new HttpError(400, 'Pick a deadline in the future.');
  if (deadline.getTime() > Date.now() + 366 * 24 * 3600 * 1000) {
    throw new HttpError(400, 'Deadlines can be at most one year away.');
  }

  const { rows } = await query(
    `INSERT INTO campaigns (organizer_id, brand, title, brief, prize, deadline)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.user.id, brand, title, brief, prize, deadline.toISOString()],
  );
  res.status(201).json(await campaignDetail(rows[0].id, req.user));
});

// GET /api/campaigns/:id -> campaign + my_submission + winner
campaignsRouter.get('/:id', requireAuth, async (req, res) => {
  res.json(await campaignDetail(req.params.id, req.user));
});

// DELETE /api/campaigns/:id -> organizer only
campaignsRouter.delete('/:id', requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.params.id, req.user);
  requireOrganizer(campaign);
  await query('DELETE FROM campaigns WHERE id = $1', [campaign.id]);
  res.json({ deleted: true, id: campaign.id });
});

// POST /api/campaigns/:id/submissions  { title, content } -> 201 idea
campaignsRouter.post('/:id/submissions', requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.params.id, req.user);
  if (campaign.is_organizer) throw new HttpError(403, 'Organizers can’t enter their own campaign.');
  if (campaign.status !== 'open') throw new HttpError(409, 'This campaign is no longer accepting ideas.');

  const body = bodyOf(req);
  const title = text(body.title);
  const content = text(body.content);
  const problem = lengthProblem('Idea title', title, 3, 120) ?? lengthProblem('Idea description', content, 30, 5000);
  if (problem) throw new HttpError(400, problem);

  try {
    const { rows } = await query(
      `INSERT INTO submissions (campaign_id, author_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, is_winner, created_at, author_id`,
      [campaign.id, req.user.id, title, content],
    );
    res.status(201).json(shapeIdea({ ...rows[0], author_username: req.user.username, agent_profile: null }));
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'You already submitted an idea to this campaign.');
    throw err;
  }
});

// GET /api/campaigns/:id/submissions -> organizer only: every idea, ranked
campaignsRouter.get('/:id/submissions', requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.params.id, req.user);
  requireOrganizer(campaign);
  res.json({ campaign_id: campaign.id, submissions: await rankedSubmissions(campaign.id) });
});

// POST /api/campaigns/:id/winner  { submission_id } -> organizer (or admin) only. Undo: DELETE (features/edit).
// This is the ONLY way a winner is ever set, and it requires a person's login.
// The AI layer has no code path that touches is_winner.
campaignsRouter.post('/:id/winner', requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.params.id, req.user);
  requireOrganizer(campaign);
  if (campaign.status === 'winner_selected') throw new HttpError(409, 'A winner was already picked for this campaign.');

  const body = bodyOf(req);
  const submissionId = text(body.submission_id ?? body.submissionId);
  if (!isUuid(submissionId)) throw new HttpError(400, 'Send the submission_id of the winning idea.');

  let updated;
  try {
    ({ rowCount: updated } = await query(
      'UPDATE submissions SET is_winner = true WHERE id = $1 AND campaign_id = $2',
      [submissionId, campaign.id],
    ));
  } catch (err) {
    // The partial unique index allows one winner per campaign, even under a race.
    if (err.code === '23505') throw new HttpError(409, 'A winner was already picked for this campaign.');
    throw err;
  }
  if (!updated) throw new HttpError(404, 'That idea isn’t part of this campaign.');
  res.json(await campaignDetail(campaign.id, req.user));
});
