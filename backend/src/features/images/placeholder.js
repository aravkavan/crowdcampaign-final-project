// A clearly labelled placeholder card, used when no Cloudflare key is set,
// so the demo flow never breaks. It is an SVG built from escaped text only.

const PALETTES = {
  photo: ['#2a36e8', '#7b83ff'],
  poster: ['#ff7a1a', '#ffd23f'],
  closeup: ['#137a4f', '#7fd8a6'],
  crowd: ['#7a2ae8', '#ff6fb5'],
};

const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

function wrap(text, width, maxLines) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
      if (lines.length === maxLines) break;
    } else line += ` ${word}`;
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  return lines;
}

export function placeholderImage(style, label, title) {
  const [a, b] = PALETTES[style] ?? PALETTES.photo;
  const lines = wrap(title, 22, 3)
    .map((l, i) => `<text x="64" y="${430 + i * 62}" font-size="52" font-weight="700" fill="#fff">${escapeXml(l)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#g)"/>
<circle cx="820" cy="210" r="140" fill="#fff" opacity="0.18"/><circle cx="900" cy="880" r="220" fill="#fff" opacity="0.10"/>
<g font-family="Arial, Helvetica, sans-serif">
<text x="64" y="120" font-size="34" font-weight="700" fill="#fff" opacity="0.9">${escapeXml(label.toUpperCase())}</text>
${lines}
<rect x="64" y="860" width="896" height="96" rx="20" fill="#000" opacity="0.28"/>
<text x="96" y="920" font-size="32" fill="#fff">Placeholder: add a Cloudflare key for real pictures</text>
</g></svg>`;
  return { bytes: Buffer.from(svg, 'utf8'), mime: 'image/svg+xml' };
}
