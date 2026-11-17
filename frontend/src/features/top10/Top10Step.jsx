// Step 4: safety check, then the AI ranks the best 10. A person picks the winner from here.
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button } from '../../components/ui.jsx';
import { plural } from '../../lib/format.js';
import Step from '../flow/Step.jsx';
import SourceTag from '../ideas/SourceTag.jsx';
import FactorsBar from './FactorsBar.jsx';
import RankedIdea from './RankedIdea.jsx';
import SafetyTag from './SafetyTag.jsx';

export default function Top10Step({ campaign, ideas, judge, decided, onIdeas, onPick, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const top = ideas.filter((i) => i.shortlisted);
  const blocked = ideas.filter((i) => i.safety?.status === 'block');
  const warned = ideas.filter((i) => i.safety?.status === 'warn');
  const checked = ideas.some((i) => i.safety);

  // force: re-score every idea (after new brand factors, or for a second opinion).
  async function makeTop10(force = false) {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/evaluate`, { method: 'POST', body: force ? { force: true } : {} });
      onIdeas(result.submissions);
      setNote(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const ranked = top.length > 0;
  return (
    <Step
      id="step-top10"
      number={4}
      title="Top 10"
      hint="Safety check first, then the AI ranks the best 10."
      done={top.length > 0}
      locked={!ideas.length}
      action={
        !decided && ideas.length ? (
          <Button onClick={() => makeTop10(ranked)} loading={busy}>
            {ranked ? 'Re-rank' : 'Make Top 10'}
          </Button>
        ) : null
      }
    >
      {busy ? <p className="step-wait" role="status">Checking safety and scoring ideas. With an AI judge this takes up to a minute.</p> : null}
      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{note}</Alert>
      {judge ? (
        <p className={`judge-note ${judge.is_ai ? '' : 'judge-note-offline'}`}>
          Judge: <strong>{judge.label}</strong>
        </p>
      ) : null}

      {ideas.length ? <FactorsBar campaign={campaign} onChanged={onChanged} disabled={decided} /> : null}

      {checked ? (
        <div className="counts">
          <span className="count count-ok">{ideas.length - blocked.length - warned.length} safe</span>
          {warned.length ? <span className="count count-warn">{warned.length} to check</span> : null}
          {blocked.length ? <span className="count count-block">{blocked.length} blocked</span> : null}
        </div>
      ) : null}

      {top.length ? (
        <ol className="leaderboard">
          {top.map((idea) => (
            <RankedIdea key={idea.id} idea={idea} canPick={!decided} onPick={() => onPick(idea)} />
          ))}
        </ol>
      ) : ideas.length ? (
        <p className="muted">Press “Make Top 10”.</p>
      ) : (
        <p className="muted">Waiting for ideas.</p>
      )}

      {blocked.length ? (
        <details className="more-ideas">
          <summary>Blocked by the safety check ({blocked.length})</summary>
          <ul className="idea-mini-list">
            {blocked.map((idea) => (
              <li key={idea.id} className="idea-mini">
                <p className="idea-mini-title">{idea.title}</p>
                <div className="entry-tags">
                  <SourceTag author={idea.author} origin={idea.origin} />
                  <SafetyTag safety={idea.safety} />
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {top.length && ideas.length > top.length + blocked.length ? (
        <p className="step-foot muted">{plural(ideas.length - top.length - blocked.length, 'other idea')} scored below the Top 10.</p>
      ) : null}
    </Step>
  );
}
