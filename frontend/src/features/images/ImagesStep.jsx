// Step 6: pictures of the winning idea. Keep the ones you like, redo the rest, download any.
import { useCallback, useEffect, useState } from 'react';
import { api, imageSrc } from '../../api.js';
import { Alert, Button } from '../../components/ui.jsx';
import Step from '../flow/Step.jsx';
import ImageTile from './ImageTile.jsx';

export default function ImagesStep({ campaign, onChosen }) {
  const hasWinner = Boolean(campaign.winner);
  const [images, setImages] = useState([]);
  const [maker, setMaker] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!hasWinner) {
      setImages([]);
      return;
    }
    const result = await api(`/api/campaigns/${campaign.id}/images`);
    setImages(result.images);
    setMaker({ real: result.real, label: result.maker });
  }, [campaign.id, hasWinner, campaign.winner?.id]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function act(key, request, after) {
    setBusy(key);
    setError('');
    try {
      const result = await request();
      if (result.images) setImages(result.images);
      if (after) await after(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const make = () =>
    act('make', () => api(`/api/campaigns/${campaign.id}/images`, { method: 'POST', body: {} }), (r) => {
      setNote(r.message);
      setMaker({ real: r.real, label: r.maker });
    });
  const keep = (image) =>
    act(image.id, () => api(`/api/campaigns/${campaign.id}/images/${image.id}/keep`, { method: 'POST', body: { keep: !image.kept } }));
  const choose = (image) =>
    act(image.id, () => api(`/api/campaigns/${campaign.id}/images/${image.id}/choose`, { method: 'POST', body: {} }), onChosen);

  const kept = images.filter((i) => i.kept);
  const latestRound = Math.max(0, ...images.map((i) => i.round));
  const fresh = images.filter((i) => !i.kept && i.round === latestRound);
  const older = images.filter((i) => !i.kept && i.round !== latestRound);
  const toRedo = fresh.length || 4;
  const label = !images.length ? 'Make images' : fresh.length ? `Redo the rest (${toRedo})` : 'Make 4 more';

  const tile = (image) => (
    <ImageTile key={image.id} image={image} busy={busy} onKeep={() => keep(image)} onChoose={() => choose(image)} downloadUrl={`${imageSrc(image.url)}?download=1`} />
  );

  return (
    <Step
      id="step-images"
      number={6}
      title="Images"
      hint="Keep the ones you like. Redo the rest."
      done={kept.some((i) => i.chosen)}
      locked={!hasWinner}
      action={
        hasWinner ? (
          <Button onClick={make} loading={busy === 'make'} disabled={Boolean(busy) && busy !== 'make'}>
            {label}
          </Button>
        ) : null
      }
    >
      {!hasWinner ? <p className="muted">Unlocks after you pick a winner.</p> : null}
      {busy === 'make' ? <p className="step-wait" role="status">Making {toRedo} picture{toRedo === 1 ? '' : 's'}. About 15 to 30 seconds.</p> : null}
      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{note}</Alert>
      {maker && !maker.real && images.length ? <p className="judge-note judge-note-offline">Placeholder pictures (no picture key set).</p> : null}

      {kept.length ? (
        <>
          <h3 className="image-group-title">Kept ({kept.length})</h3>
          <div className="image-grid">{kept.map(tile)}</div>
        </>
      ) : null}

      {fresh.length || older.length ? (
        <>
          {kept.length ? <h3 className="image-group-title">New</h3> : null}
          <div className="image-grid">{[...fresh, ...older].map(tile)}</div>
        </>
      ) : null}

      {busy === 'make' && !images.length ? (
        <div className="image-grid">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="image-tile image-skeleton" aria-hidden="true" />
          ))}
        </div>
      ) : null}
    </Step>
  );
}
