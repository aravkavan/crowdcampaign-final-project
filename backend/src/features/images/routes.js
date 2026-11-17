// Picture routes.
//   POST /api/campaigns/:id/images                    organizer: make 4 pictures of the winner (also "Redo")
//   GET  /api/campaigns/:id/images                    organizer: the current pictures
//   POST /api/campaigns/:id/images/:imageId/choose    organizer: use this picture
//   GET  /api/images/:imageId                         the picture itself (long random id, no login,
//                                                     so a plain <img> tag can show it)
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError } from '../../lib/http.js';
import { isUuid } from '../../lib/validate.js';
import { organizerRoute } from '../shared/organizer.js';
import { mapLimit } from '../shared/text.js';
import { imageMakerLabel, imageMakerReady, makeImage } from './cloudflare.js';
import { placeholderImage } from './placeholder.js';
import { STYLES, imagePrompts } from './prompts.js';
import { chooseImage, currentImages, nextRound, readImage, saveImages, shapeImage } from './store.js';

export const imagesRouter = Router();

const LABELS = Object.fromEntries(STYLES.map((s) => [s.key, s.label]));

async function winnerOf(campaign) {
  const { rows } = await query('SELECT id, title, content FROM submissions WHERE campaign_id = $1 AND is_winner', [campaign.id]);
  if (!rows[0]) throw new HttpError(409, 'Pick a winner first. Pictures are made only for the winning idea.');
  return rows[0];
}

organizerRoute(imagesRouter, 'post', '/campaigns/:id/images', async (req, res, campaign) => {
  const winner = await winnerOf(campaign);
  const prompts = await imagePrompts(winner, campaign);
  const real = imageMakerReady();
  const errors = [];

  const made = await mapLimit(prompts, 2, async (p) => {
    if (!real) return { ...p, ...placeholderImage(p.style, p.label, winner.title), method: 'placeholder' };
    try {
      return { ...p, ...(await makeImage(p.prompt)), method: imageMakerLabel() };
    } catch (err) {
      errors.push(err.message);
      return null;
    }
  });
  const good = made.filter(Boolean);
  if (!good.length) throw new HttpError(502, `No pictures could be made (${errors[0]}). Nothing was changed. Try again in a minute.`);

  const saved = await saveImages(campaign.id, winner.id, await nextRound(campaign.id), good);
  const message = real
    ? `Made ${good.length} pictures.${errors.length ? ` ${errors.length} failed (${errors[0]}).` : ''}`
    : 'Made 4 placeholder cards. Add a Cloudflare key to get real pictures.';
  res.json({ maker: imageMakerLabel(), real, message, images: saved.map((row) => shapeImage(row, LABELS)) });
});

organizerRoute(imagesRouter, 'get', '/campaigns/:id/images', async (req, res, campaign) => {
  const rows = await currentImages(campaign.id);
  res.json({ maker: imageMakerLabel(), real: imageMakerReady(), images: rows.map((row) => shapeImage(row, LABELS)) });
});

organizerRoute(imagesRouter, 'post', '/campaigns/:id/images/:imageId/choose', async (req, res, campaign) => {
  if (!isUuid(req.params.imageId) || !(await chooseImage(campaign.id, req.params.imageId))) {
    throw new HttpError(404, 'That picture isn’t part of this campaign.');
  }
  const rows = await currentImages(campaign.id);
  res.json({ images: rows.map((row) => shapeImage(row, LABELS)) });
});

imagesRouter.get('/images/:imageId', async (req, res) => {
  if (!isUuid(req.params.imageId)) throw new HttpError(404, 'Picture not found.');
  const image = await readImage(req.params.imageId);
  if (!image) throw new HttpError(404, 'Picture not found.');
  res.set({
    'Content-Type': image.mime,
    'Cache-Control': 'private, max-age=86400',
    // Pictures are only ever shown, never run: no scripts, even inside an SVG.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  res.send(image.data);
});
