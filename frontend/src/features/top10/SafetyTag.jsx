// The safety check result for one idea.
export default function SafetyTag({ safety }) {
  if (!safety || safety.status === 'pass') return null;
  const blocked = safety.status === 'block';
  const why = safety.reasons.map((r) => r.why + (r.found ? ` (“${r.found}”)` : '')).join('; ');
  return (
    <span className={`safety ${blocked ? 'safety-block' : 'safety-warn'}`} title={why}>
      {blocked ? 'Blocked' : 'Check'}: {safety.reasons[0]?.why}
    </span>
  );
}
