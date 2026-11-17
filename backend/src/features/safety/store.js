// Runs the safety check over every idea of a campaign and saves the results.
// It is fast (no AI), so it simply re-runs each time the Top 10 is made.
import { query, withTransaction } from '../../db.js';
import { checkText } from './check.js';

export async function checkCampaignIdeas(campaign) {
  const { rows: ideas } = await query('SELECT id, title, content FROM submissions WHERE campaign_id = $1', [campaign.id]);
  const results = ideas.map((idea) => ({ id: idea.id, ...checkText(`${idea.title}\n${idea.content}`, campaign.brand_card) }));
  await withTransaction(async (client) => {
    for (const r of results) {
      await client.query(
        `INSERT INTO safety_checks (submission_id, status, reasons) VALUES ($1, $2, $3)
         ON CONFLICT (submission_id) DO UPDATE SET status = EXCLUDED.status, reasons = EXCLUDED.reasons, checked_at = now()`,
        [r.id, r.status, JSON.stringify(r.reasons)],
      );
    }
  });
  return {
    ok: results.filter((r) => r.status === 'pass').length,
    warned: results.filter((r) => r.status === 'warn').length,
    blocked: results.filter((r) => r.status === 'block').length,
  };
}
