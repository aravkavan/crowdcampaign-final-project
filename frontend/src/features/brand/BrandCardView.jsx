// Read-only brand card. Shown to the organizer (step 1) and to everyone pitching ideas.
export function hasBrandCard(card) {
  return Boolean(card && (card.stands_for || card.values?.length || card.history || card.personality || card.never?.length));
}

export default function BrandCardView({ card }) {
  if (!hasBrandCard(card)) return null;
  return (
    <dl className="card-grid">
      {card.stands_for ? (
        <div className="card-row card-row-wide">
          <dt>Stands for</dt>
          <dd>{card.stands_for}</dd>
        </div>
      ) : null}
      {card.values?.length ? (
        <div className="card-row">
          <dt>Values</dt>
          <dd className="chips">
            {card.values.map((v) => (
              <span key={v} className="chip">{v}</span>
            ))}
          </dd>
        </div>
      ) : null}
      {card.personality ? (
        <div className="card-row">
          <dt>Personality</dt>
          <dd>{card.personality}</dd>
        </div>
      ) : null}
      {card.history ? (
        <div className="card-row card-row-wide">
          <dt>History</dt>
          <dd>{card.history}</dd>
        </div>
      ) : null}
      {card.never?.length ? (
        <div className="card-row card-row-wide">
          <dt>Never</dt>
          <dd className="chips">
            {card.never.map((v) => (
              <span key={v} className="chip chip-never">{v}</span>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
