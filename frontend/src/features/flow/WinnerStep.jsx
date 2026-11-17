// Step 5: the winner. Only a person can pick it (from the Top 10 above).
import Step from './Step.jsx';
import SourceTag from '../ideas/SourceTag.jsx';

export default function WinnerStep({ campaign }) {
  const winner = campaign.winner;
  return (
    <Step id="step-winner" number={5} title="Winner" hint="You pick. The AI never does." done={Boolean(winner)} locked={!winner}>
      {winner ? (
        <div className="winner-mini">
          <p className="winner-mini-title">
            <span className="marker">{winner.title}</span>
          </p>
          <SourceTag author={winner.author} origin={winner.origin} />
          <p className="idea-text">{winner.content}</p>
        </div>
      ) : (
        <p className="muted">Press “Pick as winner” on an idea in the Top 10.</p>
      )}
    </Step>
  );
}
