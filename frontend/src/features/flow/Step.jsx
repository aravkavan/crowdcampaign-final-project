// One numbered step card on the organizer's page.
export default function Step({ id, number, title, hint, done = false, locked = false, action, children }) {
  return (
    <section id={id} className={`step ${done ? 'step-done' : ''} ${locked ? 'step-locked' : ''}`} aria-labelledby={`${id}-title`}>
      <header className="step-head">
        <span className="step-number" aria-hidden="true">{done ? '✓' : number}</span>
        <div className="step-heading">
          <h2 id={`${id}-title`} className="step-title">
            <span className="visually-hidden">Step {number}: </span>
            {title}
          </h2>
          {hint ? <p className="step-hint">{hint}</p> : null}
        </div>
        {action ? <div className="step-action">{action}</div> : null}
      </header>
      {children ? <div className="step-body">{children}</div> : null}
    </section>
  );
}
