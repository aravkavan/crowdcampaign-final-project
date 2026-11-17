// What ideas are scored on: the 4 usual scores + up to 3 brand factors (AI-suggested, editable).
import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Button } from '../../components/ui.jsx';

const BASE = ['Creativity', 'Fits brand & moment', 'Doable', 'Reach'];

export default function FactorsBar({ campaign, onChanged, disabled }) {
  const factors = campaign.score_factors ?? [];
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function run(kind, request) {
    setBusy(kind);
    setError('');
    try {
      await request();
      await onChanged();
      setEditing(null);
      setNote('Press “Re-rank” to score with them.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }
  const suggest = () => run('suggest', () => api(`/api/campaigns/${campaign.id}/factors/suggest`, { method: 'POST', body: {} }));
  const save = () =>
    run('save', () => api(`/api/campaigns/${campaign.id}/factors`, { method: 'PUT', body: { factors: editing.filter((f) => f.trim()) } }));

  return (
    <div className="factors">
      <div className="factors-row">
        <span className="factors-label">Scored on</span>
        {BASE.map((name) => (
          <span key={name} className="factor-chip">{name}</span>
        ))}
        {factors.map((name) => (
          <span key={name} className="factor-chip factor-brand">{name}</span>
        ))}
      </div>
      {editing ? (
        <div className="factors-edit">
          {[0, 1, 2].map((n) => (
            <input
              key={n}
              className="factor-input"
              aria-label={`Brand factor ${n + 1}`}
              placeholder={`Brand factor ${n + 1} (optional)`}
              maxLength={60}
              value={editing[n] ?? ''}
              onChange={(e) => setEditing(Object.assign([...editing], { [n]: e.target.value }))}
            />
          ))}
          <div className="form-actions">
            <Button size="small" onClick={save} loading={busy === 'save'}>Save</Button>
            <Button size="small" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="factors-actions">
          <Button size="small" variant="secondary" onClick={suggest} loading={busy === 'suggest'} disabled={disabled || Boolean(busy)}>
            {factors.length ? 'Suggest again' : 'Add brand factors (AI)'}
          </Button>
          <Button size="small" variant="ghost" onClick={() => setEditing([...factors, '', '', ''].slice(0, 3))} disabled={disabled || Boolean(busy)}>
            Edit factors
          </Button>
        </div>
      )}
      <Alert tone="error">{error}</Alert>
      {note ? <p className="muted small">{note}</p> : null}
    </div>
  );
}
