// "Edit details": change the brand, title, brief, prize or deadline (organizer or grader).
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button, Field } from '../../components/ui.jsx';

function toLocalInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditCampaign({ campaign, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function start() {
    setForm({ brand: campaign.brand, title: campaign.title, brief: campaign.brief, prize: campaign.prize, deadline: toLocalInput(campaign.deadline) });
    setError('');
    setOpen(true);
  }
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const deadline = new Date(form.deadline);
      const body = { brand: form.brand, title: form.title, brief: form.brief, prize: form.prize };
      if (toLocalInput(campaign.deadline) !== form.deadline) body.deadline = deadline.toISOString();
      await api(`/api/campaigns/${campaign.id}`, { method: 'PATCH', body });
      await onSaved();
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="edit-row">
        {campaign.managed_as_admin ? <span className="admin-tag">Grader: you can edit every campaign</span> : null}
        <Button variant="secondary" size="small" onClick={start}>Edit details</Button>
      </div>
    );
  }
  return (
    <form className="panel stack edit-form" onSubmit={save} noValidate>
      <h2 className="panel-title">Edit details</h2>
      <Alert tone="error">{error}</Alert>
      <Field label="Brand" value={form.brand} maxLength={80} onChange={update('brand')} />
      <Field label="Title" value={form.title} maxLength={120} onChange={update('title')} />
      <Field label="Brief" as="textarea" rows={6} value={form.brief} maxLength={4000} onChange={update('brief')} />
      <Field label="Prize" value={form.prize} maxLength={120} onChange={update('prize')} />
      <Field label="Deadline" type="datetime-local" value={form.deadline} onChange={update('deadline')} />
      <div className="form-actions">
        <Button type="submit" loading={busy}>Save</Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}
