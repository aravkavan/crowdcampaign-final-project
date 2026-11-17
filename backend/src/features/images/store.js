// Pictures in the database: save a round, list the latest round, choose one, read one.
import { query, withTransaction } from '../../db.js';

const LIST_COLUMNS = 'id, round, style, prompt, method, chosen, created_at';

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

// The newest round, plus the chosen picture if it came from an older round.
export async function currentImages(campaignId) {
  const { rows } = await query(
    `SELECT ${LIST_COLUMNS} FROM idea_images
      WHERE campaign_id = $1
        AND (chosen OR round = (SELECT max(round) FROM idea_images WHERE campaign_id = $1))
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
    await client.query('UPDATE idea_images SET chosen = true WHERE id = $1', [imageId]);
    return true;
  });
}

export async function readImage(imageId) {
  const { rows } = await query('SELECT mime, data FROM idea_images WHERE id = $1', [imageId]);
  return rows[0] ?? null;
}
