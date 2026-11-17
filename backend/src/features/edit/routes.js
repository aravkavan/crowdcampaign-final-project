// Edit and undo, for the organizer (or the admin account):
//   PATCH  /api/campaigns/:id          { brand?, title?, brief?, prize?, deadline? }  -> campaign
//   DELETE /api/campaigns/:id/winner   undo the winner (its pictures go too)          -> campaign
//   DELETE /api/campaigns/:id/agents   remove the AI agents' ideas                    -> { removed, submissions }
import { Router } from 'express';
import { query, withTransaction } from '../../db.js';
import { HttpError, bodyOf } from '../../lib/http.js';
import { campaignDetail } from '../../routes/campaigns.js';
import { rankedSubmissions } from '../../services/submissions.js';
import { organizerRoute } from '../shared/organizer.js';
import { editedFields } from './fields.js';

export const editRouter = Router();

organizerRoute(editRouter, 'patch', '/campaigns/:id', async (req, res, campaign) => {
  const fields = editedFields(bodyOf(req));
  const keys = Object.keys(fields);
  const sets = keys.map((key, n) => `${key} = $${n + 2}`).join(', ');
  await query(`UPDATE campaigns SET ${sets} WHERE id = $1`, [campaign.id, ...keys.map((key) => fields[key])]);
  res.json(await campaignDetail(campaign.id, req.user));
});

organizerRoute(editRouter, 'delete', '/campaigns/:id/winner', async (req, res, campaign) => {
  if (campaign.status !== 'winner_selected') throw new HttpError(409, 'There is no winner to undo.');
  await withTransaction(async (client) => {
    await client.query('DELETE FROM idea_images WHERE campaign_id = $1', [campaign.id]);
    await client.query('UPDATE submissions SET is_winner = false WHERE campaign_id = $1 AND is_winner', [campaign.id]);
  });
  res.json(await campaignDetail(campaign.id, req.user));
});

organizerRoute(editRouter, 'delete', '/campaigns/:id/agents', async (req, res, campaign) => {
  if (campaign.status === 'winner_selected') throw new HttpError(409, 'Undo the winner first.');
  const { rowCount } = await query(`DELETE FROM submissions WHERE campaign_id = $1 AND origin <> 'human'`, [campaign.id]);
  res.json({ removed: rowCount, submissions: await rankedSubmissions(campaign.id) });
});
