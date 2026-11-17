// The brand card: who the brand is. Every idea-giver (people and agents) sees it,
// the judge scores against it, and its "never" list feeds the safety check.
import { clip, clipList } from '../shared/text.js';

export const BRAND_FIELDS = ['stands_for', 'values', 'history', 'personality', 'never', 'about'];

// Keeps only known fields, trimmed and size-limited. Never trust the AI or the browser.
export function cleanBrandCard(input = {}) {
  return {
    stands_for: clip(input.stands_for, 300),
    values: clipList(input.values, 6, 60),
    history: clip(input.history, 400),
    personality: clip(input.personality, 200),
    never: clipList(input.never, 6, 120),
    about: clip(input.about, 3000),
  };
}

export function isEmptyBrandCard(card) {
  return !card || (!card.stands_for && !card.values?.length && !card.history && !card.personality && !card.never?.length);
}

// Plain-text version for prompts.
export function brandCardText(card) {
  if (isEmptyBrandCard(card)) return 'No brand card yet.';
  return [
    card.stands_for && `Stands for: ${card.stands_for}`,
    card.values?.length && `Values: ${card.values.join(', ')}`,
    card.history && `History: ${card.history}`,
    card.personality && `Personality: ${card.personality}`,
    card.never?.length && `Never: ${card.never.join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}
