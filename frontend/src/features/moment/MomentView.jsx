// Read-only context card ("the moment"). Shown to the organizer and to everyone pitching.
export const MOMENT_FIELDS = [
  ['moment', 'Moment or event', 'A farewell match for a football legend'],
  ['place', 'Place', 'Barcelona, Spain'],
  ['audience', 'Audience', 'Football fans, families, students'],
  ['age_group', 'Age group', '18–60'],
  ['product', 'Product', 'Fresh orange juice in cups'],
  ['timing', 'Timing', 'Week before, match night, day after'],
  ['culture_notes', 'Culture notes', 'Local language first. Warm, not salesy. No politics.'],
];

export function hasMoment(context) {
  return Boolean(context && MOMENT_FIELDS.some(([key]) => context[key]));
}

export default function MomentView({ context }) {
  if (!hasMoment(context)) return null;
  return (
    <dl className="card-grid">
      {MOMENT_FIELDS.filter(([key]) => context[key]).map(([key, label]) => (
        <div key={key} className={`card-row ${key === 'moment' || key === 'culture_notes' ? 'card-row-wide' : ''}`}>
          <dt>{label}</dt>
          <dd>{context[key]}</dd>
        </div>
      ))}
    </dl>
  );
}
