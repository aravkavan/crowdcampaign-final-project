// Checks one piece of text against the rules and the brand's "never" list.
// Returns { status: 'pass' | 'warn' | 'block', reasons: [{ level, why, found }] }.
import { plain } from '../shared/text.js';
import { RULES } from './rules.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (word) => new RegExp(`(^|[^a-z0-9])${escapeRe(plain(word))}($|[^a-z0-9])`);

// Compiled once.
const COMPILED = RULES.map((rule) => ({
  ...rule,
  tests: rule.patterns ?? rule.words.map((word) => ({ word, re: wordRe(word) })),
}));

// Words too general to match on their own (the main rules already cover famous
// people, logos, tragedy, politics and religion).
const SKIP = new Set([
  'about', 'their', 'there', 'other', 'never', 'things', 'brand', 'brands', 'marketing', 'without', 'jokes', 'names',
  'faces', 'logos', 'people', 'celebrities', 'celebrity', 'famous', 'teams', 'tragedy', 'politics', 'religion', 'anyone',
  'should', 'could', 'using', 'mocking', 'stunts', 'deals',
]);

// "No alcohol tie-ins" -> ["alcohol", "tie-ins"]: the words worth matching.
function neverWords(never = []) {
  return never.flatMap((item) =>
    (plain(item).match(/[a-z][a-z-]{4,}/g) ?? []).filter((word) => !SKIP.has(word)).map((word) => ({ item, word, re: wordRe(word) })),
  );
}

export function checkText(text, brandCard) {
  const haystack = ` ${plain(text)} `;
  const reasons = [];

  for (const rule of COMPILED) {
    for (const test of rule.tests) {
      const hit = test instanceof RegExp ? test.test(haystack) : test.re.test(haystack);
      if (hit) {
        reasons.push({ level: rule.level, why: rule.why, found: test instanceof RegExp ? undefined : test.word });
        break; // one reason per rule is enough
      }
    }
  }
  // The "official" warning is redundant when a stronger sponsor claim was found.
  const filtered = reasons.some((r) => r.why.startsWith('claims an official'))
    ? reasons.filter((r) => !r.why.startsWith('says "official"'))
    : reasons;

  const seen = new Set();
  for (const { item, word, re } of neverWords(brandCard?.never)) {
    if (!seen.has(item) && re.test(haystack)) {
      seen.add(item);
      filtered.push({ level: 'warn', why: `goes against the brand card: "${item}"`, found: word });
    }
  }

  const status = filtered.some((r) => r.level === 'block') ? 'block' : filtered.length ? 'warn' : 'pass';
  return { status, reasons: filtered };
}
