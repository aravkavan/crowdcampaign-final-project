// Database changes for the Nov 16 features. Safe to run on every start (IF NOT EXISTS).
export const FEATURE_SCHEMA = `
-- AI agents are users that can never log in. Real people have NULL here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_profile JSONB;

-- One campaign = one brand + one moment.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_card JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS context JSONB;

-- Where an idea came from: 'human', or 'agent:<method>' for AI agents.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'human';

-- Result of the safety check for each idea.
CREATE TABLE IF NOT EXISTS safety_checks (
  submission_id UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'block')),
  reasons       JSONB NOT NULL DEFAULT '[]',
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pictures made for the winning idea. One may be chosen per campaign.
CREATE TABLE IF NOT EXISTS idea_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  round         INTEGER NOT NULL,
  style         TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  mime          TEXT NOT NULL,
  data          BYTEA NOT NULL,
  method        TEXT NOT NULL,
  chosen        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idea_images_campaign_idx ON idea_images (campaign_id, round);
CREATE UNIQUE INDEX IF NOT EXISTS idea_images_one_chosen ON idea_images (campaign_id) WHERE chosen;
`;
