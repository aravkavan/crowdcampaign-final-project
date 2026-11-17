import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageSrc } from '../api.js';
import { useAuth } from '../auth.jsx';
import MarketIntelBox from '../components/MarketIntelBox.jsx';
import ShortText from '../components/ShortText.jsx';
import { Alert, Button, EmptyState, Field, PageLoader, StatusBadge } from '../components/ui.jsx';
import BrandCardView, { hasBrandCard } from '../features/brand/BrandCardView.jsx';
import OrganizerFlow from '../features/flow/OrganizerFlow.jsx';
import SourceTag from '../features/ideas/SourceTag.jsx';
import MomentView, { hasMoment } from '../features/moment/MomentView.jsx';
import { formatDateTime, timeLeft } from '../lib/format.js';

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaign(await api(`/api/campaigns/${id}`));
      setError('');
    } catch (err) {
      if (err.status === 404) setMissing(true);
      else setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) {
    return (
      <div className="page">
        <EmptyState title="This campaign doesn’t exist" action={<Link to="/campaigns" className="btn btn-primary">Browse campaigns</Link>}>
          It may have been deleted by its organizer.
        </EmptyState>
      </div>
    );
  }
  if (!campaign) {
    return <div className="page">{error ? <Alert tone="error">{error}</Alert> : <PageLoader label="Loading the brief" />}</div>;
  }

  return (
    <div className="page">
      <Link to="/campaigns" className="back-link">All campaigns</Link>
      <header className="campaign-head">
        <p className="campaign-brand">{campaign.brand}</p>
        <h1 className="display campaign-title">{campaign.title}</h1>
      </header>

      <div className="campaign-grid">
        <article className="brief-doc" aria-label="The brief">
          <h2 className="brief-doc-title">The brief</h2>
          <ShortText className="brief-doc-text" text={campaign.brief} more="Show full brief" />
        </article>
        <aside className="facts" aria-label="Campaign details">
          <dl>
            <div className="fact">
              <dt>Prize</dt>
              <dd className="fact-prize"><span className="marker">{campaign.prize}</span></dd>
            </div>
            <div className="fact">
              <dt>Status</dt>
              <dd><StatusBadge status={campaign.status} /></dd>
            </div>
            <div className="fact">
              <dt>Deadline</dt>
              <dd>
                {formatDateTime(campaign.deadline)}
                {campaign.status === 'open' ? <span className="fact-sub">{timeLeft(campaign.deadline)}</span> : null}
              </dd>
            </div>
            <div className="fact">
              <dt>Ideas so far</dt>
              <dd>{campaign.submission_count}</dd>
            </div>
            <div className="fact">
              <dt>Organizer</dt>
              <dd>@{campaign.organizer.username}{campaign.is_organizer ? ' (you)' : ''}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {campaign.winner && !campaign.is_organizer ? <WinnerBanner winner={campaign.winner} campaign={campaign} /> : null}

      {campaign.is_organizer ? (
        <OrganizerFlow campaign={campaign} onChanged={load} />
      ) : (
        <ParticipantPanel campaign={campaign} onSubmitted={load} />
      )}

      {/* Market intel from the tracker, below the main steps so the flow stays first. */}
      <MarketIntelBox campaignId={campaign.id} />
    </div>
  );
}

function WinnerBanner({ winner, campaign }) {
  const { user } = useAuth();
  const yours = winner.author.id === user.id;
  return (
    <section className="winner" aria-labelledby="winner-heading">
      <p className="winner-label" id="winner-heading">
        {yours ? 'Your idea won this campaign' : `Winning idea, picked by @${campaign.organizer.username}`}
      </p>
      <div className={campaign.winner_image ? 'winner-with-image' : ''}>
        <div>
          <h2 className="winner-title"><span className="marker">{winner.title}</span></h2>
          <p className="winner-author">
            <SourceTag author={winner.author} origin={winner.origin} />
          </p>
          <p className="winner-text">{winner.content}</p>
        </div>
        {campaign.winner_image ? (
          <figure className="winner-image">
            <img src={imageSrc(campaign.winner_image)} alt="Picture for the winning idea" />
            <figcaption>AI mockup</figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ participants

function ParticipantPanel({ campaign, onSubmitted }) {
  const mine = campaign.my_submission;
  if (mine) {
    return (
      <section className="panel" aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="panel-title">Your idea</h2>
        <h3 className="idea-title">{mine.title}</h3>
        <p className="idea-text">{mine.content}</p>
        <p className="muted small">
          Submitted {formatDateTime(mine.created_at)}.{' '}
          {campaign.status === 'open' && 'The organizer reviews ideas and picks a winner after the deadline.'}
          {campaign.status === 'judging' && 'The organizer is reviewing ideas now.'}
          {campaign.status === 'winner_selected' && !mine.is_winner && 'A different idea won this time. Thanks for pitching.'}
        </p>
      </section>
    );
  }
  // Once a winner is shown above, there is nothing more to say here.
  if (campaign.status === 'winner_selected') return null;
  if (campaign.status !== 'open') {
    return (
      <section className="panel">
        <EmptyState title="This campaign has closed">
          The deadline passed and the organizer is choosing a winner.
        </EmptyState>
      </section>
    );
  }
  return (
    <>
      <BeforeYouPitch campaign={campaign} />
      <SubmitIdea campaign={campaign} onSubmitted={onSubmitted} />
    </>
  );
}

// The brand card and the moment, so people pitch ideas that fit.
function BeforeYouPitch({ campaign }) {
  const brand = hasBrandCard(campaign.brand_card);
  const moment = hasMoment(campaign.context);
  if (!brand && !moment) return null;
  return (
    <section className="panel" aria-labelledby="know-heading">
      <h2 id="know-heading" className="panel-title">Before you pitch</h2>
      {moment ? (
        <>
          <h3 className="know-sub">The moment</h3>
          <MomentView context={campaign.context} />
        </>
      ) : null}
      {brand ? (
        <>
          <h3 className="know-sub">The brand</h3>
          <BrandCardView card={campaign.brand_card} />
        </>
      ) : null}
      <p className="muted small know-rule">No famous names, faces or logos. They get blocked.</p>
    </section>
  );
}

function SubmitIdea({ campaign, onSubmitted }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (title.trim().length < 3) found.title = 'Give your idea a title (at least 3 characters).';
    if (content.trim().length < 30) found.content = 'Describe your idea in at least 30 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/campaigns/${campaign.id}/submissions`, { method: 'POST', body: { title: title.trim(), content: content.trim() } });
      await onSubmitted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="pitch-heading">
      <h2 id="pitch-heading" className="panel-title">Pitch your idea</h2>
      <p className="muted">One idea per person. Only the organizer sees it.</p>
      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Alert tone="error">{error}</Alert>
        <Field label="Idea title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <Field
          as="textarea"
          rows={7}
          label="Your idea"
          value={content}
          maxLength={5000}
          onChange={(e) => setContent(e.target.value)}
          error={errors.content}
          hint={`${content.trim().length} / 5000 characters`}
        />
        <div className="form-actions">
          <Button type="submit" loading={busy}>Submit idea</Button>
        </div>
      </form>
    </section>
  );
}
