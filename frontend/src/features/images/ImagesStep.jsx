// Step 6: 4 pictures of the winning idea. Pick one, or Redo for 4 new ones.
import { useCallback, useEffect, useState } from 'react';
import { api, imageSrc } from '../../api.js';
import { Alert, Button } from '../../components/ui.jsx';
import Step from '../flow/Step.jsx';

export default function ImagesStep({ campaign, onChosen }) {
  const hasWinner = Boolean(campaign.winner);
  const [images, setImages] = useState([]);
  const [maker, setMaker] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!hasWinner) return;
    const result = await api(`/api/campaigns/${campaign.id}/images`);
    setImages(result.images);
    setMaker({ real: result.real, label: result.maker });
  }, [campaign.id, hasWinner]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function make() {
    setBusy('make');
    setError('');
    setNote('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/images`, { method: 'POST', body: {} });
      await load();
      if (result.real) setNote(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function choose(image) {
    setBusy(image.id);
    setError('');
    try {
      const result = await api(`/api/campaigns/${campaign.id}/images/${image.id}/choose`, { method: 'POST', body: {} });
      setImages(result.images);
      await onChosen();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const chosen = images.find((i) => i.chosen);
  const latestRound = Math.max(0, ...images.map((i) => i.round));
  const shown = images.filter((i) => i.round === latestRound || i.chosen);

  return (
    <Step
      id="step-images"
      number={6}
      title="Images"
      hint="4 pictures of the winner. Pick one."
      done={Boolean(chosen)}
      locked={!hasWinner}
      action={
        hasWinner ? (
          <Button onClick={make} loading={busy === 'make'} disabled={Boolean(busy) && busy !== 'make'}>
            {images.length ? 'Redo: 4 new pictures' : 'Make images'}
          </Button>
        ) : null
      }
    >
      {!hasWinner ? <p className="muted">Unlocks after you pick a winner.</p> : null}
      {busy === 'make' ? <p className="step-wait" role="status">Making 4 pictures. This takes about 15 to 30 seconds.</p> : null}
      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{note}</Alert>
      {maker && !maker.real && images.length ? (
        <p className="judge-note judge-note-offline">Placeholder pictures (no picture key set).</p>
      ) : null}

      {busy === 'make' && !images.length ? (
        <div className="image-grid">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="image-tile image-skeleton" aria-hidden="true" />
          ))}
        </div>
      ) : null}

      {shown.length ? (
        <div className="image-grid">
          {shown.map((image) => (
            <figure key={image.id} className={`image-tile ${image.chosen ? 'image-chosen' : ''}`}>
              <img src={imageSrc(image.url)} alt={`${image.label} for the winning idea`} loading="lazy" />
              <figcaption>
                <span className="image-label">
                  {image.label}
                  <span className="image-ai">AI mockup</span>
                </span>
                {image.chosen ? (
                  <span className="won-tag">Chosen</span>
                ) : (
                  <Button variant="secondary" size="small" onClick={() => choose(image)} loading={busy === image.id} disabled={Boolean(busy)}>
                    Use this
                  </Button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </Step>
  );
}
