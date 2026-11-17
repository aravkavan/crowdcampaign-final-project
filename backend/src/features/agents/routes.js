// AI agent routes (organizer only).
//   POST /api/campaigns/:id/agents  { count? (1-10, default 10) }  -> agents add their ideas
//   GET  /api/agents                                               -> who the agents are
import { Router } from 'express';
import { requireAuth } from '../../auth/requireAuth.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { rankedSubmissions } from '../../services/submissions.js';
import { organizerRoute } from '../shared/organizer.js';
import { addAgentIdeas } from './generate.js';
import { PERSONAS, agentProfile } from './personas.js';

export const agentsRouter = Router();

agentsRouter.get('/agents', requireAuth, (req, res) => {
  res.json({ agents: PERSONAS.map(agentProfile) });
});

organizerRoute(agentsRouter, 'post', '/campaigns/:id/agents', async (req, res, campaign) => {
  if (campaign.status === 'winner_selected') throw new HttpError(409, 'A winner was already picked, so no new ideas can be added.');
  const requested = Number.parseInt(bodyOf(req).count ?? 10, 10);
  const count = Number.isInteger(requested) ? Math.min(10, Math.max(1, requested)) : 10;

  const result = await addAgentIdeas(campaign, count);
  if (!result.added.length && result.failed.length) {
    throw new HttpError(502, `The AI agents couldn’t write ideas right now (${result.failed[0].error}). Nothing was added.`);
  }
  const names = result.added.length ? `${result.added.length} AI ideas added.` : 'Every agent has already given an idea.';
  const problems = result.failed.length ? ` ${result.failed.length} failed: press again.` : '';
  res.json({ ...result, message: names + problems, submissions: await rankedSubmissions(campaign.id) });
});
