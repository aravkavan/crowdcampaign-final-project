// Brand factors: up to 3 short things this brand cares about most in this campaign,
// e.g. "Gets people tasting the juice". The judge scores each idea on them too.
import { clipList } from '../shared/text.js';

export const MAX_FACTORS = 3;

export function cleanFactors(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  return clipList(list.map((item) => (typeof item === 'object' && item ? item.name : item)), MAX_FACTORS * 2, 60)
    .filter((name) => name.length >= 3 && !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()))
    .slice(0, MAX_FACTORS);
}

// For prompts: "1. Gets people tasting the juice" one per line.
export function factorsText(factors) {
  return (factors ?? []).map((name, n) => `${n + 1}. ${name}`).join('\n');
}
