// Brand factor routes (organizer or admin).
//   POST /api/campaigns/:id/factors/suggest  -> AI suggests up to 3 and saves them
//   PUT  /api/campaigns/:id/factors          { factors: ["...", ...] } -> save edits (0-3)
// Changing factors doesn't re-score by itself: press "Re-rank" to apply them.
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { organizerRoute } from '../shared/organizer.js';
import { cleanFactors } from './card.js';
import { suggestFactors } from './suggest.js';

export const factorsRouter = Router();

async function save(campaignId, factors) {
  await query('UPDATE campaigns SET score_factors = $1 WHERE id = $2', [JSON.stringify(factors), campaignId]);
}

organizerRoute(factorsRouter, 'post', '/campaigns/:id/factors/suggest', async (req, res, campaign) => {
  let suggested;
  try {
    suggested = await suggestFactors(campaign);
  } catch (err) {
    throw new HttpError(502, `The AI couldn’t suggest factors (${err.message}). Nothing was changed. You can type them yourself.`);
  }
  await save(campaign.id, suggested.factors);
  res.json({ score_factors: suggested.factors, method: suggested.method });
});

organizerRoute(factorsRouter, 'put', '/campaigns/:id/factors', async (req, res, campaign) => {
  const factors = cleanFactors(bodyOf(req).factors);
  await save(campaign.id, factors);
  res.json({ score_factors: factors });
});
