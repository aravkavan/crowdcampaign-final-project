// Step 1: the brand card. "Draft with AI" fills it in; the organizer can edit it.
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button, Field } from '../../components/ui.jsx';
import Step from '../flow/Step.jsx';
import BrandCardView, { hasBrandCard } from './BrandCardView.jsx';

const lines = (list) => (list ?? []).join('\n');
const toList = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);

export default function BrandStep({ campaign, onSaved }) {
  const card = campaign.brand_card ?? {};
  const done = hasBrandCard(card);
  const [about, setAbout] = useState(card.about ?? '');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function draft() {
    setBusy('draft');
    setError('');
    setNote('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/brand-card/draft`, { method: 'POST', body: { about } });
      setNote(result.method === 'offline' ? 'Drafted from a template (no AI key set). Edit it to make it right.' : 'Drafted by AI. Check it and edit anything that’s off.');
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function startEdit() {
    setForm({
      stands_for: card.stands_for ?? '',
      values: lines(card.values),
      personality: card.personality ?? '',
      history: card.history ?? '',
      never: lines(card.never),
    });
    setEditing(true);
    setNote('');
  }

  async function save(event) {
    event.preventDefault();
    setBusy('save');
    setError('');
    try {
      await api(`/api/campaigns/${campaign.id}/brand-card`, {
        method: 'PUT',
        body: { ...form, values: toList(form.values), never: toList(form.never), about },
      });
      setEditing(false);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Step
      id="step-brand"
      number={1}
      title="Brand card"
      hint="Who the brand is."
      done={done}
      action={
        done && !editing ? (
          <Button variant="ghost" size="small" onClick={startEdit}>
            Edit
          </Button>
        ) : null
      }
    >
      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{note}</Alert>

      {editing && form ? (
        <form className="stack" onSubmit={save}>
          <Field label="Stands for" value={form.stands_for} onChange={set('stands_for')} maxLength={300} />
          <div className="field-pair">
            <Field as="textarea" rows={4} label="Values (one per line)" value={form.values} onChange={set('values')} />
            <Field as="textarea" rows={4} label="Never (one per line)" value={form.never} onChange={set('never')} hint="The safety check warns about these." />
          </div>
          <Field label="Personality" value={form.personality} onChange={set('personality')} maxLength={200} />
          <Field as="textarea" rows={2} label="History" value={form.history} onChange={set('history')} maxLength={400} />
          <div className="form-actions">
            <Button type="submit" loading={busy === 'save'}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={Boolean(busy)}>Cancel</Button>
          </div>
        </form>
      ) : done ? (
        <BrandCardView card={card} />
      ) : (
        <div className="stack">
          <Field
            as="textarea"
            rows={4}
            label="About the brand (optional)"
            hint="Optional: paste the brand’s About text."
            value={about}
            maxLength={3000}
            onChange={(e) => setAbout(e.target.value)}
          />
          <div className="form-actions">
            <Button onClick={draft} loading={busy === 'draft'}>Draft with AI</Button>
            <Button variant="ghost" onClick={startEdit} disabled={Boolean(busy)}>Write it myself</Button>
          </div>
        </div>
      )}

      {done && !editing ? (
        <p className="step-foot">
          <button type="button" className="text-button" onClick={draft} disabled={Boolean(busy)}>
            {busy === 'draft' ? 'Redrafting…' : 'Redraft with AI'}
          </button>
        </p>
      ) : null}
    </Step>
  );
}
