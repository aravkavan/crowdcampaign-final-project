// The organizer's page: 6 steps from brand card to images.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Alert, Button, ConfirmDialog } from '../../components/ui.jsx';
import { plural } from '../../lib/format.js';
import BrandStep from '../brand/BrandStep.jsx';
import { hasBrandCard } from '../brand/BrandCardView.jsx';
import ImagesStep from '../images/ImagesStep.jsx';
import IdeasStep from '../ideas/IdeasStep.jsx';
import SourceTag from '../ideas/SourceTag.jsx';
import MomentStep from '../moment/MomentStep.jsx';
import { hasMoment } from '../moment/MomentView.jsx';
import Top10Step from '../top10/Top10Step.jsx';
import StepBar from './StepBar.jsx';
import WinnerStep from './WinnerStep.jsx';

export default function OrganizerFlow({ campaign, onChanged }) {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState(null);
  const [judge, setJudge] = useState(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState(null);
  const [picking, setPicking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadIdeas = useCallback(async () => {
    const [list, status] = await Promise.all([api(`/api/campaigns/${campaign.id}/submissions`), api('/api/ai/status')]);
    setIdeas(list.submissions);
    setJudge(status);
  }, [campaign.id]);

  useEffect(() => {
    loadIdeas().catch((err) => setError(err.message));
  }, [loadIdeas]);

  async function pickWinner() {
    setPicking(true);
    setError('');
    try {
      await api(`/api/campaigns/${campaign.id}/winner`, { method: 'POST', body: { submission_id: choice.id } });
      setChoice(null);
      await Promise.all([onChanged(), loadIdeas()]);
      document.getElementById('step-winner')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setError(err.message);
      setChoice(null);
    } finally {
      setPicking(false);
    }
  }

  async function deleteCampaign() {
    setDeleting(true);
    try {
      await api(`/api/campaigns/${campaign.id}`, { method: 'DELETE' });
      navigate('/campaigns', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const list = ideas ?? [];
  const decided = campaign.status === 'winner_selected';
  const done = {
    'step-brand': hasBrandCard(campaign.brand_card),
    'step-moment': hasMoment(campaign.context),
    'step-ideas': list.length > 0,
    'step-top10': list.some((i) => i.shortlisted),
    'step-winner': Boolean(campaign.winner),
    'step-images': Boolean(campaign.winner_image),
  };

  return (
    <section className="flow" aria-label="Run this campaign">
      <StepBar done={done} />
      <Alert tone="error">{error}</Alert>

      <BrandStep campaign={campaign} onSaved={onChanged} />
      <MomentStep campaign={campaign} onSaved={onChanged} />
      <IdeasStep campaign={campaign} ideas={list} decided={decided} onIdeas={setIdeas} />
      <Top10Step campaign={campaign} ideas={list} judge={judge} decided={decided} onIdeas={setIdeas} onPick={setChoice} />
      <WinnerStep campaign={campaign} />
      <ImagesStep campaign={campaign} onChosen={onChanged} />

      <div className="danger-zone">
        <Button variant="danger-ghost" size="small" onClick={() => setDeleteOpen(true)}>
          Delete this campaign
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(choice)}
        title="Pick this idea as the winner?"
        confirmLabel="Pick winner"
        busy={picking}
        onConfirm={pickWinner}
        onCancel={() => setChoice(null)}
      >
        {choice ? (
          <>
            <p>
              <strong>{choice.title}</strong>
            </p>
            <p>
              <SourceTag author={choice.author} origin={choice.origin} />
            </p>
            <p>This is final. Next you can make pictures for it.</p>
          </>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this campaign?"
        confirmLabel="Delete campaign"
        tone="danger"
        busy={deleting}
        onConfirm={deleteCampaign}
        onCancel={() => setDeleteOpen(false)}
      >
        <p>The brief and all {plural(list.length, 'idea')} will be removed for good.</p>
      </ConfirmDialog>
    </section>
  );
}
