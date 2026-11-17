// Makes one picture with Cloudflare Workers AI (FLUX.1 schnell by default).
// Free daily allowance; on the free plan, requests past the limit simply fail.
import { config } from '../../config.js';

export function imageMakerReady() {
  return Boolean(config.images.accountId && config.images.apiToken);
}

export function imageMakerLabel() {
  return imageMakerReady() ? `Cloudflare (${config.images.model.split('/').pop()})` : 'Placeholders (no Cloudflare key set)';
}

function mimeOf(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.slice(0, 4).toString() === 'RIFF') return 'image/webp';
  return null;
}

export async function makeImage(prompt) {
  const { accountId, apiToken, model, apiUrl, timeoutMs } = config.images;
  let res;
  try {
    res = await fetch(`${apiUrl}/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 4, seed: Math.floor(Math.random() * 1_000_000) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(err?.name === 'TimeoutError' ? 'Cloudflare took too long to answer' : 'couldn’t reach Cloudflare');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    const detail = data?.errors?.[0]?.message;
    const hint =
      res.status === 401 || res.status === 403
        ? 'the Cloudflare token or account ID was rejected'
        : res.status === 429
          ? 'today’s free image allowance is used up'
          : `Cloudflare error ${res.status}`;
    throw new Error(detail ? `${hint} (${String(detail).slice(0, 120)})` : hint);
  }

  const base64 = data?.result?.image;
  if (typeof base64 !== 'string' || !base64) throw new Error('Cloudflare sent no image');
  const bytes = Buffer.from(base64, 'base64');
  const mime = mimeOf(bytes);
  if (!mime) throw new Error('Cloudflare sent something that is not an image');
  return { bytes, mime };
}
