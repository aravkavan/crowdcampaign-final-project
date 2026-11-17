// Step 3: ideas from people and from AI agents.
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button } from '../../components/ui.jsx';
import { plural } from '../../lib/format.js';
import Step from '../flow/Step.jsx';
import SourceTag from './SourceTag.jsx';

export default function IdeasStep({ campaign, ideas, decided, onIdeas }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [left, setLeft] = useState(null);

  const fromAgents = ideas.filter((i) => i.author.agent).length;
  const fromPeople = ideas.length - fromAgents;

  async function removeAgents() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/agents`, { method: 'DELETE' });
      onIdeas(result.submissions);
      setNote(`Removed ${plural(result.removed, 'AI idea')}.`);
      setLeft(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addAgents() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/agents`, { method: 'POST', body: { count: 10 } });
      onIdeas(result.submissions);
      setNote(result.message);
      setLeft(result.left);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const noneLeft = left === 0;
  return (
    <Step
      id="step-ideas"
      number={3}
      title="Ideas"
      hint="People pitch here. AI agents add more."
      done={ideas.length > 0}
      action={
        !decided ? (
          <Button onClick={addAgents} loading={busy} disabled={noneLeft}>
            {noneLeft ? 'All agents used' : 'Add AI ideas'}
          </Button>
        ) : null
      }
    >
      {busy ? <p className="step-wait" role="status">10 AI agents are writing ideas. This takes about 20 seconds.</p> : null}
      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{note}</Alert>

      <div className="counts">
        <span className="count count-person">{plural(fromPeople, 'idea')} from people</span>
        <span className="count count-agent">{plural(fromAgents, 'idea')} from AI agents</span>
        {fromAgents && !decided ? (
          <button type="button" className="text-button" onClick={removeAgents} disabled={busy}>
            Remove AI ideas
          </button>
        ) : null}
      </div>

      {ideas.length ? (
        <details className="more-ideas">
          <summary>See all {plural(ideas.length, 'idea')}</summary>
          <ul className="idea-mini-list">
            {ideas.map((idea) => (
              <li key={idea.id} className="idea-mini">
                <p className="idea-mini-title">{idea.title}</p>
                <SourceTag author={idea.author} origin={idea.origin} />
                <p className="idea-mini-text">{idea.content}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="muted">No ideas yet. Share the campaign, or press “Add AI ideas”.</p>
      )}
    </Step>
  );
}
