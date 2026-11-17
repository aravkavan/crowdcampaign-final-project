// Context card route (organizer only).
//   PUT /api/campaigns/:id/context  { place, audience, age_group, product, moment, timing, culture_notes }
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { organizerRoute } from '../shared/organizer.js';
import { cleanContext, isEmptyContext } from './card.js';

export const contextRouter = Router();

organizerRoute(contextRouter, 'put', '/campaigns/:id/context', async (req, res, campaign) => {
  const context = cleanContext(bodyOf(req));
  if (isEmptyContext(context)) throw new HttpError(400, 'Fill in at least one field, like the place or the moment.');
  await query('UPDATE campaigns SET context = $1 WHERE id = $2', [JSON.stringify(context), campaign.id]);
  res.json({ context });
});
