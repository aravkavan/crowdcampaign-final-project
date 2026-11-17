// Picks which agents join a campaign: the ones closest to its place, audience and age
// group first, then the rest for variety. Same campaign + same context = same order.
import { plain } from '../shared/text.js';
import { PERSONAS } from './personas.js';

function ageRange(text) {
  const numbers = (plain(text).match(/\d+/g) ?? []).map(Number);
  if (numbers.length >= 2) return [Math.min(...numbers), Math.max(...numbers)];
  if (/gen ?z|student|teen/.test(plain(text))) return [18, 27];
  if (/older|senior|retire/.test(plain(text))) return [55, 90];
  return null;
}

function fit(persona, context) {
  context = context ?? {};
  const place = plain(context.place);
  const audience = plain(`${context.audience} ${context.moment} ${context.product}`);
  let score = 0;
  if (place && (place.includes(plain(persona.city)) || place.includes(plain(persona.country)))) score += 4;
  if (place && plain(persona.city).split(/[ ,]+/).some((part) => part.length > 3 && place.includes(part))) score += 1;
  score += persona.tags.filter((tag) => audience.includes(tag) || audience.includes(tag.replace(/s$/, ''))).length * 2;
  const range = ageRange(context.age_group);
  if (range && persona.age >= range[0] && persona.age <= range[1]) score += 2;
  return score;
}

// Agents not yet used in this campaign, best fit first, at most `count`.
export function pickAgents(context, usedKeys, count) {
  return PERSONAS.map((persona, order) => ({ persona, order, score: fit(persona, context) }))
    .filter(({ persona }) => !usedKeys.has(persona.key))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, count)
    .map(({ persona }) => persona);
}
