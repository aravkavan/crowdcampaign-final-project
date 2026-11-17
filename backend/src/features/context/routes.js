// Context card routes (organizer or admin).
//   PUT  /api/campaigns/:id/context        { place, audience, age_group, product, moment, timing, culture_notes }
//   POST /api/campaigns/:id/context/find   AI finds a moment (again = a different one), saves it
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { organizerRoute } from '../shared/organizer.js';
import { CONTEXT_FIELDS, aiFieldsOf, cleanContext, isEmptyContext } from './card.js';
import { findMoment } from './find.js';

export const contextRouter = Router();

organizerRoute(contextRouter, 'put', '/campaigns/:id/context', async (req, res, campaign) => {
  const context = cleanContext(bodyOf(req));
  if (isEmptyContext(context)) throw new HttpError(400, 'Fill in at least one field, like the place or the moment.');
  // A field stays "AI" only if the AI filled it and the person left it exactly as it was.
  const before = campaign.context ?? {};
  const wasAi = aiFieldsOf(before);
  context.ai_fields = Object.keys(CONTEXT_FIELDS).filter((key) => context[key] && wasAi.includes(key) && context[key] === before[key]);
  await query('UPDATE campaigns SET context = $1 WHERE id = $2', [JSON.stringify(context), campaign.id]);
  res.json({ context });
});

organizerRoute(contextRouter, 'post', '/campaigns/:id/context/find', async (req, res, campaign) => {
  let found;
  try {
    found = await findMoment(campaign);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, `The AI couldn’t find a moment (${err.message}). Nothing was changed. You can type it yourself.`);
  }
  await query('UPDATE campaigns SET context = $1 WHERE id = $2', [JSON.stringify(found.context), campaign.id]);
  res.json({ context: found.context, method: found.method, kept: found.kept });
});
