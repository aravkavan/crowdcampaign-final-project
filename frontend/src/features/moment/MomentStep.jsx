// Step 2: the moment (context card): where, who, when, what's happening.
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button, Field } from '../../components/ui.jsx';
import Step from '../flow/Step.jsx';
import MomentView, { MOMENT_FIELDS, hasMoment } from './MomentView.jsx';

export default function MomentStep({ campaign, onSaved }) {
  const context = campaign.context ?? {};
  const done = hasMoment(context);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    setForm(Object.fromEntries(MOMENT_FIELDS.map(([key]) => [key, context[key] ?? ''])));
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/campaigns/${campaign.id}/context`, { method: 'PUT', body: form });
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Step
      id="step-moment"
      number={2}
      title="The moment"
      hint="Where, who, and what’s happening."
      done={done}
      action={
        !editing ? (
          <Button variant={done ? 'ghost' : 'primary'} size="small" onClick={startEdit}>
            {done ? 'Edit' : 'Add the moment'}
          </Button>
        ) : null
      }
    >
      <Alert tone="error">{error}</Alert>
      {editing ? (
        <form className="stack" onSubmit={save}>
          <div className="moment-form">
            {MOMENT_FIELDS.map(([key, label, example]) => (
              <Field
                key={key}
                as={key === 'culture_notes' ? 'textarea' : 'input'}
                rows={key === 'culture_notes' ? 2 : undefined}
                className={key === 'moment' || key === 'culture_notes' ? 'moment-wide' : ''}
                label={label}
                placeholder={example}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            ))}
          </div>
          <div className="form-actions">
            <Button type="submit" loading={busy}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
          </div>
        </form>
      ) : (
        <MomentView context={context} />
      )}
    </Step>
  );
}
