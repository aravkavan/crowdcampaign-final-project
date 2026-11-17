// Agent accounts and their ideas in the database.
import { query } from '../../db.js';
import { agentProfile, agentUsername } from './personas.js';

// An agent account can never log in: its "password hash" is not a real hash,
// so every login attempt fails the normal check.
const NO_LOGIN = 'agent-account-cannot-log-in';

export async function ensureAgentUser(persona) {
  const username = agentUsername(persona);
  const profile = JSON.stringify({ ...agentProfile(persona), kind: 'ai-agent' });
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, agent_profile)
     VALUES ($1, NULL, $2, $3)
     ON CONFLICT (lower(username)) DO UPDATE SET agent_profile = EXCLUDED.agent_profile
       WHERE users.agent_profile IS NOT NULL
     RETURNING id`,
    [username, NO_LOGIN, profile],
  );
  // null when a real person already owns that username (then this agent sits out)
  return rows[0]?.id ?? null;
}

// Keys of the agents that already gave an idea to this campaign.
export async function usedAgentKeys(campaignId) {
  const { rows } = await query(
    `SELECT u.agent_profile->>'key' AS key
       FROM submissions s JOIN users u ON u.id = s.author_id
      WHERE s.campaign_id = $1 AND u.agent_profile IS NOT NULL`,
    [campaignId],
  );
  return new Set(rows.map((row) => row.key));
}

export async function saveAgentIdea(campaignId, userId, idea, origin) {
  const { rowCount } = await query(
    `INSERT INTO submissions (campaign_id, author_id, title, content, origin)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (campaign_id, author_id) DO NOTHING`,
    [campaignId, userId, idea.title, idea.content, origin],
  );
  return rowCount === 1;
}
