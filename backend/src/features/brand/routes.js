// Brand card routes (organizer only).
//   POST /api/campaigns/:id/brand-card/draft  { about? }  -> AI drafts and saves it
//   PUT  /api/campaigns/:id/brand-card        { ...card } -> save the organizer's edits
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { organizerRoute } from '../shared/organizer.js';
import { clip } from '../shared/text.js';
import { cleanBrandCard, isEmptyBrandCard } from './card.js';
import { draftBrandCard } from './draft.js';

export const brandRouter = Router();

async function save(campaignId, card) {
  await query('UPDATE campaigns SET brand_card = $1 WHERE id = $2', [JSON.stringify(card), campaignId]);
}

organizerRoute(brandRouter, 'post', '/campaigns/:id/brand-card/draft', async (req, res, campaign) => {
  const about = clip(bodyOf(req).about, 3000);
  let drafted;
  try {
    drafted = await draftBrandCard(campaign, about);
  } catch (err) {
    throw new HttpError(502, `The AI couldn’t draft the brand card (${err.message}). Nothing was changed. You can fill it in yourself.`);
  }
  await save(campaign.id, drafted.card);
  res.json({ brand_card: drafted.card, method: drafted.method });
});

organizerRoute(brandRouter, 'put', '/campaigns/:id/brand-card', async (req, res, campaign) => {
  const card = cleanBrandCard(bodyOf(req));
  if (isEmptyBrandCard(card)) throw new HttpError(400, 'Fill in at least one part of the brand card.');
  await save(campaign.id, card);
  res.json({ brand_card: card });
});
