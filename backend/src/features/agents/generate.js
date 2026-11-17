// Asks each picked agent for one idea (separate calls, a few at a time) and saves them.
import { aiAvailable, aiMethod, askJson } from '../../ai/ask.js';
import { mapLimit } from '../shared/text.js';
import { offlineAgentIdea } from './offline.js';
import { pickAgents } from './pick.js';
import { AGENT_SYSTEM, agentPrompt, parseAgentIdea } from './prompt.js';
import { PERSONAS } from './personas.js';
import { ensureAgentUser, saveAgentIdea, usedAgentKeys } from './store.js';

const AT_ONCE = 3; // parallel AI calls: kind to free-tier rate limits

async function oneIdea(persona, campaign) {
  if (!aiAvailable()) {
    const index = PERSONAS.findIndex((p) => p.key === persona.key);
    return { idea: offlineAgentIdea(persona, campaign, index), origin: 'agent:offline' };
  }
  // A higher temperature keeps agents from sounding alike.
  const reply = await askJson({ system: AGENT_SYSTEM, prompt: agentPrompt(persona, campaign), temperature: 1.0 });
  const idea = parseAgentIdea(reply);
  if (!idea) throw new Error('the AI reply had no usable idea');
  return { idea, origin: `agent:${aiMethod()}` };
}

// Returns { added: [names], failed: [{ name, error }], left: number of unused agents }.
export async function addAgentIdeas(campaign, count) {
  const used = await usedAgentKeys(campaign.id);
  const chosen = pickAgents(campaign.context, used, count);
  const added = [];
  const failed = [];

  await mapLimit(chosen, AT_ONCE, async (persona) => {
    try {
      const userId = await ensureAgentUser(persona);
      if (!userId) return;
      const { idea, origin } = await oneIdea(persona, campaign);
      if (await saveAgentIdea(campaign.id, userId, idea, origin)) added.push(persona.name);
    } catch (err) {
      failed.push({ name: persona.name, error: err.message });
    }
  });

  return { added, failed, left: PERSONAS.length - used.size - added.length };
}
