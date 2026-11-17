// One small door to the AI for the new features (brand card, agents, image prompts).
// It uses the same provider and key as the judge. Returns null when no AI is set,
// so every caller can fall back to its labelled offline version.
import { describeJudge } from './evaluator.js';
import { extractJson } from './prompt.js';
import { askClaude } from './providers/anthropic.js';
import { askGemini } from './providers/gemini.js';

export function aiAvailable() {
  return describeJudge().is_ai;
}

export function aiMethod() {
  const judge = describeJudge();
  return judge.is_ai ? `${judge.provider}:${judge.model}` : 'offline';
}

// Asks the AI and returns parsed JSON. Retries once on a busy/rate-limited provider.
export async function askJson({ system, prompt, temperature }) {
  const judge = describeJudge();
  if (!judge.is_ai) return null;
  const ask = judge.provider === 'anthropic' ? askClaude : askGemini;
  try {
    return extractJson(await ask({ system, prompt, temperature }));
  } catch (err) {
    if (!err.retryable) throw err;
    await new Promise((resolve) => setTimeout(resolve, Math.min(err.retryAfterMs ?? 2500, 10_000)));
    return extractJson(await ask({ system, prompt, temperature }));
  }
}
