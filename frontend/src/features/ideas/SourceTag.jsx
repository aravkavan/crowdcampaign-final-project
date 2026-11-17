// Who gave an idea: a real person, or an AI agent (with its made-up profile).
export default function SourceTag({ author, origin }) {
  if (author?.agent) {
    const a = author.agent;
    const offline = origin === 'agent:offline';
    return (
      <span className="source source-agent" title={offline ? 'Offline sample, not written by AI' : `AI agent: ${a.job}`}>
        <span className="source-kind">AI agent</span> {a.name}, {a.age}, {a.city}
        {offline ? <span className="source-note"> · sample</span> : null}
      </span>
    );
  }
  return (
    <span className="source source-person">
      <span className="source-kind">Person</span> @{author?.username}
    </span>
  );
}
