// Who gave an idea: a real person, or an AI agent. Click an agent to see who it is.
import { useEffect, useRef, useState } from 'react';

function AgentCard({ agent, offline, onClose }) {
  return (
    <span className="agent-card" role="dialog" aria-label={`About ${agent.name}`}>
      <span className="agent-card-head">
        <strong>{agent.name}, {agent.age}</strong>
        <button type="button" className="agent-card-close" onClick={onClose} aria-label="Close">×</button>
      </span>
      <span className="agent-card-line">{agent.city}{agent.country && !agent.city.includes(agent.country) ? `, ${agent.country}` : ''}</span>
      <span className="agent-card-line">{agent.job}</span>
      {agent.voice ? <span className="agent-card-line"><b>Thinks:</b> {agent.voice}</span> : null}
      {agent.languages ? <span className="agent-card-line"><b>Speaks:</b> {agent.languages}</span> : null}
      {agent.interests?.length ? <span className="agent-card-line"><b>Into:</b> {agent.interests.join(', ')}</span> : null}
      <span className="agent-card-note">{offline ? 'Offline sample, not written by AI.' : 'A made-up AI persona, not a real person.'}</span>
    </span>
  );
}

export default function SourceTag({ author, origin }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !ref.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (author?.agent) {
    const a = author.agent;
    const offline = origin === 'agent:offline';
    return (
      <span className="source-wrap" ref={ref}>
        <button type="button" className="source source-agent source-button" aria-expanded={open} onClick={() => setOpen(!open)} title="Who is this?">
          <span className="source-kind">AI agent</span> {a.name}, {a.age}, {a.city}
          {offline ? <span className="source-note"> · sample</span> : null}
        </button>
        {open ? <AgentCard agent={a} offline={offline} onClose={() => setOpen(false)} /> : null}
      </span>
    );
  }
  return (
    <span className="source source-person">
      <span className="source-kind">Person</span> @{author?.username}
    </span>
  );
}
