// Every idea for a campaign, best AI score first. Ideas without a score come last.
// Ideas the safety check blocked are never ranked and never enter the Top 10.
import { query } from '../db.js';
import { agentDetails } from '../features/agents/personas.js';

export const SHORTLIST_SIZE = 10;

function authorOf(row) {
  const agent = row.agent_profile;
  return {
    id: row.author_id,
    username: row.author_username,
    // Present only for AI agents: name, age, city, country, job.
    agent: agentDetails(agent),
  };
}

export async function rankedSubmissions(campaignId) {
  const { rows } = await query(
    `SELECT s.id, s.title, s.content, s.is_winner, s.created_at, s.origin,
            s.author_id, u.username AS author_username, u.agent_profile,
            e.creativity, e.relevance, e.feasibility, e.marketing_potential,
            e.overall, e.summary, e.method, e.evaluated_at, e.factor_scores,
            c.status AS safety_status, c.reasons AS safety_reasons
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN evaluations e ON e.submission_id = s.id
       LEFT JOIN safety_checks c ON c.submission_id = s.id
      WHERE s.campaign_id = $1
      ORDER BY (c.status = 'block') NULLS FIRST, e.overall DESC NULLS LAST, e.relevance DESC NULLS LAST, s.created_at ASC`,
    [campaignId],
  );

  let rank = 0;
  return rows.map((row) => {
    const blocked = row.safety_status === 'block';
    const scored = row.overall !== null && !blocked;
    const position = scored ? ++rank : null;
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      is_winner: row.is_winner,
      created_at: row.created_at,
      origin: row.origin,
      author: authorOf(row),
      rank: position,
      shortlisted: scored && position <= SHORTLIST_SIZE,
      safety: row.safety_status ? { status: row.safety_status, reasons: row.safety_reasons ?? [] } : null,
      evaluation:
        row.overall !== null
          ? {
              creativity: row.creativity,
              relevance: row.relevance,
              feasibility: row.feasibility,
              marketing_potential: row.marketing_potential,
              factors: row.factor_scores ?? [],
              overall: Math.round(row.overall * 100) / 100,
              summary: row.summary,
              method: row.method,
              evaluated_at: row.evaluated_at,
            }
          : null,
    };
  });
}
