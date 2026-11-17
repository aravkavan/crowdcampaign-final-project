// One idea in the Top 10: rank, title, who gave it, score, reason, and "Pick as winner".
import { useState } from 'react';
import { Button, ScoreBar } from '../../components/ui.jsx';
import { judgeName } from '../../lib/format.js';
import SourceTag from '../ideas/SourceTag.jsx';
import SafetyTag from './SafetyTag.jsx';

export default function RankedIdea({ idea, canPick, onPick }) {
  const [open, setOpen] = useState(false);
  const e = idea.evaluation;
  return (
    <li className={`entry ${idea.is_winner ? 'entry-winner' : ''} ${open ? 'entry-open' : ''}`}>
      <span className="entry-rank" aria-label={`Rank ${idea.rank}`}>{idea.rank}</span>
      <div className="entry-body">
        <div className="entry-top">
          <div>
            <h4 className="entry-title">{idea.title}</h4>
            <div className="entry-tags">
              <SourceTag author={idea.author} origin={idea.origin} />
              <SafetyTag safety={idea.safety} />
            </div>
          </div>
          <p className="entry-overall">
            <span className="entry-overall-value">{e.overall.toFixed(1)}</span>
            <span className="entry-overall-label">score</span>
          </p>
        </div>
        <p className="entry-summary">
          {e.summary} <span className="entry-judge">{judgeName(e.method)}</span>
        </p>
        {open ? (
          <>
            <div className="entry-scores">
              <ScoreBar label="Creativity" value={e.creativity} />
              <ScoreBar label="Fits brand & moment" value={e.relevance} />
              <ScoreBar label="Doable" value={e.feasibility} />
              <ScoreBar label="Reach" value={e.marketing_potential} />
            </div>
            <p className="entry-text">{idea.content}</p>
          </>
        ) : null}
        <div className="entry-actions">
          <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Show less' : 'Read the idea'}
          </button>
          {idea.is_winner ? <span className="won-tag">Winner</span> : null}
          {!idea.is_winner && canPick ? (
            <Button variant="secondary" size="small" onClick={onPick}>
              Pick as winner
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
