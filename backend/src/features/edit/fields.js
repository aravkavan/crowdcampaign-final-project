// Checks the campaign details an organizer edits. Same rules as creating a campaign.
import { HttpError } from '../../lib/http.js';
import { lengthProblem, text } from '../../lib/validate.js';

const LIMITS = { brand: ['Brand name', 2, 80], title: ['Title', 5, 120], brief: ['Brief', 40, 4000], prize: ['Prize', 2, 120] };
const YEAR_MS = 366 * 24 * 3600 * 1000;

// Returns only the fields that were sent, cleaned. Throws 400 on the first problem.
export function editedFields(body) {
  const out = {};
  for (const [key, [label, min, max]] of Object.entries(LIMITS)) {
    if (body[key] === undefined) continue;
    const value = text(body[key]);
    const problem = lengthProblem(label, value, min, max);
    if (problem) throw new HttpError(400, problem);
    out[key] = value;
  }
  if (body.deadline !== undefined) {
    const deadline = new Date(typeof body.deadline === 'string' ? body.deadline : Number.NaN);
    if (Number.isNaN(deadline.getTime())) throw new HttpError(400, 'Deadline must be a date and time, like 2026-12-31T17:00:00Z.');
    if (deadline.getTime() <= Date.now()) throw new HttpError(400, 'Pick a deadline in the future.');
    if (deadline.getTime() > Date.now() + YEAR_MS) throw new HttpError(400, 'Deadlines can be at most one year away.');
    out.deadline = deadline.toISOString();
  }
  if (!Object.keys(out).length) throw new HttpError(400, 'Send at least one of: brand, title, brief, prize, deadline.');
  return out;
}
