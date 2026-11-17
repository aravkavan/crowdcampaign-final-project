// The progress bar across the top: 6 steps, ticked when done. Click to jump.
export const STEPS = [
  { id: 'step-brand', label: 'Brand' },
  { id: 'step-moment', label: 'Moment' },
  { id: 'step-ideas', label: 'Ideas' },
  { id: 'step-top10', label: 'Top 10' },
  { id: 'step-winner', label: 'Winner' },
  { id: 'step-images', label: 'Images' },
];

export default function StepBar({ done }) {
  const next = STEPS.findIndex((step) => !done[step.id]);
  return (
    <nav className="stepbar" aria-label="Campaign steps">
      <ol>
        {STEPS.map((step, index) => {
          const state = done[step.id] ? 'done' : index === next ? 'current' : 'todo';
          return (
            <li key={step.id} className={`stepbar-item stepbar-${state}`}>
              <a href={`#${step.id}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="stepbar-dot" aria-hidden="true">{state === 'done' ? '✓' : index + 1}</span>
                <span className="stepbar-label">{step.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
