// Small text helpers shared by the new features.

// User text goes inside XML-like tags in prompts; escape anything that could close a tag.
export function escapeTag(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A trimmed string cut to `max` characters ('' for anything that isn't text).
export function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// A clean list of short strings (from an array or a newline/comma separated string).
export function clipList(value, maxItems, maxLength) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\n|;/) : [];
  return items
    .map((item) => clip(String(item ?? ''), maxLength).replace(/^[-*•\s]+/, ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

// Lowercase, no accents: "Barça" -> "barca". Used for matching words.
export function plain(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Runs async work over a list with at most `limit` running at once.
export async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
