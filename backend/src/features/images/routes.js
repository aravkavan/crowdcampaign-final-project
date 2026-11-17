// Picture routes.
//   POST /api/campaigns/:id/images                    organizer: make pictures of the winner. The first time 4;
//                                                     after that "Redo the rest": only the ones not kept
//   GET  /api/campaigns/:id/images                    organizer: kept pictures + the newest round
//   POST /api/campaigns/:id/images/:imageId/keep      organizer: { keep: true|false } keep it (never redone)
//   POST /api/campaigns/:id/images/:imageId/choose    organizer: use this picture (also keeps it)
//   GET  /api/images/:imageId[?download=1]            the picture itself (long random id, no login,
//                                                     so a plain <img> tag can show it)
import { Router } from 'express';
import { query } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { isUuid } from '../../lib/validate.js';
import { organizerRoute } from '../shared/organizer.js';
import { mapLimit } from '../shared/text.js';
import { imageMakerLabel, imageMakerReady, makeImage } from './cloudflare.js';
import { placeholderImage } from './placeholder.js';
import { STYLES, imagePrompts } from './prompts.js';
import { chooseImage, currentImages, dropUnkept, keepImage, nextRound, readImage, saveImages, shapeImage, stylesToRedo } from './store.js';

export const imagesRouter = Router();

const LABELS = Object.fromEntries(STYLES.map((s) => [s.key, s.label]));

async function winnerOf(campaign) {
  const { rows } = await query('SELECT id, title, content FROM submissions WHERE campaign_id = $1 AND is_winner', [campaign.id]);
  if (!rows[0]) throw new HttpError(409, 'Pick a winner first. Pictures are made only for the winning idea.');
  return rows[0];
}

organizerRoute(imagesRouter, 'post', '/campaigns/:id/images', async (req, res, campaign) => {
  const winner = await winnerOf(campaign);
  const styles = await stylesToRedo(campaign.id, STYLES.map((s) => s.key));
  const prompts = (await imagePrompts(winner, campaign)).filter((p) => styles.includes(p.style));
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

  const round = await nextRound(campaign.id);
  const saved = await saveImages(campaign.id, winner.id, round, good);
  await dropUnkept(campaign.id, round);
  const message = real
    ? `Made ${good.length} new picture${good.length === 1 ? '' : 's'}.${errors.length ? ` ${errors.length} failed (${errors[0]}).` : ''}`
    : `Made ${good.length} placeholder cards (no picture key set).`;
  const rows = await currentImages(campaign.id);
  res.json({ maker: imageMakerLabel(), real, message, made: saved.length, images: rows.map((row) => shapeImage(row, LABELS)) });
});

organizerRoute(imagesRouter, 'get', '/campaigns/:id/images', async (req, res, campaign) => {
  const rows = await currentImages(campaign.id);
  res.json({ maker: imageMakerLabel(), real: imageMakerReady(), images: rows.map((row) => shapeImage(row, LABELS)) });
});

organizerRoute(imagesRouter, 'post', '/campaigns/:id/images/:imageId/keep', async (req, res, campaign) => {
  const keep = bodyOf(req).keep !== false;
  if (!isUuid(req.params.imageId) || !(await keepImage(campaign.id, req.params.imageId, keep))) {
    throw new HttpError(404, 'That picture isn’t part of this campaign.');
  }
  const rows = await currentImages(campaign.id);
  res.json({ images: rows.map((row) => shapeImage(row, LABELS)) });
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
  const wantsDownload = new URL(req.originalUrl ?? req.url, 'http://local').searchParams.get('download') === '1';
  if (wantsDownload) {
    const ext = image.mime === 'image/svg+xml' ? 'svg' : image.mime === 'image/png' ? 'png' : image.mime === 'image/webp' ? 'webp' : 'jpg';
    res.set('Content-Disposition', `attachment; filename="crowdcampaign-${image.style}-${req.params.imageId.slice(0, 8)}.${ext}"`);
  }
  res.send(image.data);
});
