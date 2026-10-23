CREATE TABLE IF NOT EXISTS portfolio_sections (
  key text PRIMARY KEY CHECK (key IN ('projects','about','journey','resume','notes')),
  draft jsonb NOT NULL,
  published jsonb,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE TABLE IF NOT EXISTS portfolio_media (
  id uuid PRIMARY KEY,
  pathname text UNIQUE NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 4000000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portfolio_media_references (
  section_key text NOT NULL REFERENCES portfolio_sections(key) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES portfolio_media(id),
  PRIMARY KEY (section_key,media_id)
);
CREATE TABLE IF NOT EXISTS portfolio_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS portfolio_limits_expiry ON portfolio_limits(expires_at);
CREATE TABLE IF NOT EXISTS portfolio_messages (
  id uuid PRIMARY KEY,
  dedupe text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('sending','sent','failed')),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
