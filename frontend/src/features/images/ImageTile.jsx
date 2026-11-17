// One picture: Keep / Kept, Download, and "Use this" (the one shown with the winner).
import { Button } from '../../components/ui.jsx';

export default function ImageTile({ image, busy, onKeep, onChoose, downloadUrl }) {
  const working = busy === image.id;
  return (
    <figure className={`image-tile ${image.chosen ? 'image-chosen' : ''} ${image.kept ? 'image-kept' : ''}`}>
      <img src={downloadUrl.replace('?download=1', '')} alt={`${image.label} for the winning idea`} loading="lazy" />
      <figcaption>
        <span className="image-label">
          {image.label}
          <span className="image-ai">AI mockup</span>
        </span>
        <span className="image-actions">
          <Button variant={image.kept ? 'primary' : 'secondary'} size="small" onClick={onKeep} loading={working} disabled={Boolean(busy) || image.chosen}>
            {image.kept ? 'Kept ✓' : 'Keep'}
          </Button>
          <a className="btn btn-ghost btn-small" href={downloadUrl} download>
            Download
          </a>
          {image.chosen ? (
            <span className="won-tag">Chosen</span>
          ) : (
            <Button variant="ghost" size="small" onClick={onChoose} disabled={Boolean(busy)}>
              Use this
            </Button>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
