// Sample agent ideas for when no AI key is set. They are templates, NOT AI,
// and the app labels them "offline sample". They let the whole flow be tried without a key.

const TEMPLATES = [
  (p, c) => [`${p.city} thank-you wall`, `As a ${p.job} in ${p.city}, I'd put up a big thank-you wall where people pin a note about ${c.moment}. Every note gets a free ${c.product}, and photos of the wall go on Instagram each day. It's about the fans' feelings, not any famous name. Cost: printing, a wall and product, roughly $1,500.`],
  (p, c) => [`Watch together with ${c.brand}`, `I'd run small watch parties for ${c.moment} in cafés and bars around ${c.place}. ${c.brand} brings ${c.product} for every table and a "who are you watching with?" photo corner. People share pictures with friends, so the brand becomes part of the night. Cost: about $2,000 for product and the photo corners.`],
  (p, c) => [`The 15-second ${c.brand} challenge`, `A quick video challenge: show your face before and after ${c.moment}, holding ${c.product}. As someone who thinks in short videos, I'd seed it with 10 local creators and give a prize for the funniest one each week. Cheap to make and easy to copy. Cost: creator fees and prizes, around $3,000.`],
  (p, c) => [`${c.brand} family photo booth`, `Families remember big moments together. I'd set up a free photo booth in ${c.place} during ${c.moment}: three generations in one picture, printed on the spot with a small ${c.brand} frame. Parents keep the print and share the digital copy. Cost: booth rental and prints, about $2,500.`],
  (p, c) => [`"Thanks for…" cups`, `Each ${c.product} comes with a blank line on the cup: "Thanks for ___". People write their own memory about ${c.moment} and post a photo. The fans tell the story and ${c.brand} is the cup in their hand. Cost: printed cups plus a small paid boost, about $2,000.`],
  (p, c) => [`Local heroes, not celebrities`, `Instead of famous faces, ${c.brand} features real people from ${c.place}: the bar owner, the grandmother who never misses a match, the kid with the hand-made flag. Short portraits posted around ${c.moment}. It feels honest and local. Cost: a photographer for two days, about $1,800.`],
  (p, c) => [`Ready for any moment`, `Before ${c.moment}, a crowd writes 20 short posts for things that might happen: a late surprise, rain, an emotional goodbye. ${c.brand} posts the right one within minutes. Being fast and on-feeling is what gets shared. Cost: almost nothing, just a team on standby.`],
  (p, c) => [`${c.brand} street art corner`, `I'd ask a local artist in ${c.place} to paint a wall about the feeling of ${c.moment}, with no names, crests or logos, just colours and crowds. People take photos in front of it, and ${c.brand} hands out ${c.product} there on the day. Cost: artist fee and permit, about $3,000.`],
];

// "A farewell match for a legend (pretend example)" -> "a farewell match for a legend"
function shortMoment(text = '') {
  const cleaned = text.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned ? cleaned[0].toLowerCase() + cleaned.slice(1) : '';
}

export function offlineAgentIdea(persona, campaign, index) {
  const context = campaign.context ?? {};
  const fill = {
    brand: campaign.brand,
    moment: shortMoment(context.moment) || 'this campaign’s big moment',
    place: context.place || persona.city,
    product: context.product || `${campaign.brand} product`,
  };
  const [title, content] = TEMPLATES[index % TEMPLATES.length](persona, fill);
  return { title, content };
}
