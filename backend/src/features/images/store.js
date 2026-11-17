// Pictures in the database: save a round, list kept + latest, keep, choose, read one.
import { query, withTransaction } from '../../db.js';

const LIST_COLUMNS = 'id, round, style, prompt, method, chosen, kept, created_at';

export function shapeImage(row, labels = {}) {
  return {
    id: row.id,
    url: `/api/images/${row.id}`,
    round: row.round,
    style: row.style,
    label: labels[row.style] ?? row.style,
    prompt: row.prompt,
    method: row.method,
    chosen: row.chosen,
    kept: row.kept || row.chosen,
  };
}

export async function nextRound(campaignId) {
  const { rows } = await query('SELECT coalesce(max(round), 0) + 1 AS next FROM idea_images WHERE campaign_id = $1', [campaignId]);
  return rows[0].next;
}

export async function saveImages(campaignId, submissionId, round, made) {
  const saved = [];
  for (const image of made) {
    const { rows } = await query(
      `INSERT INTO idea_images (campaign_id, submission_id, round, style, prompt, mime, data, method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${LIST_COLUMNS}`,
      [campaignId, submissionId, round, image.style, image.prompt, image.mime, image.bytes, image.method],
    );
    saved.push(rows[0]);
  }
  return saved;
}

// Every picture still stored: the kept ones (any round) and the newest round.
// (Older pictures that weren't kept are deleted when the next round is made.)
export async function currentImages(campaignId) {
  const { rows } = await query(
    `SELECT ${LIST_COLUMNS} FROM idea_images
      WHERE campaign_id = $1
      ORDER BY round DESC, created_at ASC`,
    [campaignId],
  );
  return rows;
}

export async function chooseImage(campaignId, imageId) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query('SELECT 1 FROM idea_images WHERE id = $1 AND campaign_id = $2', [imageId, campaignId]);
    if (!rowCount) return false;
    await client.query('UPDATE idea_images SET chosen = false WHERE campaign_id = $1 AND chosen', [campaignId]);
    await client.query('UPDATE idea_images SET chosen = true, kept = true WHERE id = $1', [imageId]);
    return true;
  });
}

// Styles to make next: the newest round's pictures that weren't kept. All 4 if every one was kept.
export async function stylesToRedo(campaignId, allStyles) {
  const { rows } = await query(
    `SELECT style FROM idea_images
      WHERE campaign_id = $1 AND NOT kept AND NOT chosen
        AND round = (SELECT max(round) FROM idea_images WHERE campaign_id = $1)`,
    [campaignId],
  );
  const wanted = new Set(rows.map((r) => r.style));
  return wanted.size ? allStyles.filter((s) => wanted.has(s)) : allStyles;
}

// After a new round, older pictures that weren't kept are no longer needed.
export async function dropUnkept(campaignId, beforeRound) {
  await query('DELETE FROM idea_images WHERE campaign_id = $1 AND round < $2 AND NOT kept AND NOT chosen', [campaignId, beforeRound]);
}

export async function keepImage(campaignId, imageId, keep) {
  const { rowCount } = await query('UPDATE idea_images SET kept = $3 WHERE id = $1 AND campaign_id = $2', [imageId, campaignId, keep]);
  return rowCount > 0;
}

export async function readImage(imageId) {
  const { rows } = await query('SELECT mime, data, style FROM idea_images WHERE id = $1', [imageId]);
  return rows[0] ?? null;
}
