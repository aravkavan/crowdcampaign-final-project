// The context card: where, who, when and what moment. Every idea-giver sees it.
import { clip } from '../shared/text.js';

export const CONTEXT_FIELDS = {
  place: 120,
  audience: 160,
  age_group: 60,
  product: 120,
  moment: 200,
  timing: 160,
  culture_notes: 400,
};

export function cleanContext(input = {}) {
  return Object.fromEntries(Object.entries(CONTEXT_FIELDS).map(([key, max]) => [key, clip(input[key], max)]));
}

// Which fields the AI filled (stored as context.ai_fields). Everything else that has a value
// was typed by a person, and the AI never changes it.
export function aiFieldsOf(context) {
  const list = Array.isArray(context?.ai_fields) ? context.ai_fields : [];
  return Object.keys(CONTEXT_FIELDS).filter((key) => list.includes(key));
}

export function humanFieldsOf(context) {
  const ai = aiFieldsOf(context);
  return Object.keys(CONTEXT_FIELDS).filter((key) => context?.[key] && !ai.includes(key));
}

export function isEmptyContext(context) {
  return !context || Object.keys(CONTEXT_FIELDS).every((key) => !context[key]);
}

const LABELS = {
  place: 'Place',
  audience: 'Audience',
  age_group: 'Age group',
  product: 'Product',
  moment: 'Moment or event',
  timing: 'Timing',
  culture_notes: 'Culture notes',
};

// Plain-text version for prompts.
export function contextText(context) {
  if (isEmptyContext(context)) return 'No context card yet.';
  return Object.keys(CONTEXT_FIELDS)
    .filter((key) => context[key])
    .map((key) => `${LABELS[key]}: ${context[key]}`)
    .join('\n');
}
