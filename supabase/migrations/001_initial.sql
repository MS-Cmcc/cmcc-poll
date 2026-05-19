-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  questions_source TEXT NOT NULL,
  questions_snapshot JSONB NOT NULL,
  current_question_index INT NOT NULL DEFAULT 0,
  display_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_code_idx ON sessions (code);
CREATE INDEX IF NOT EXISTS sessions_display_token_idx ON sessions (display_token);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  client_token TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, client_token)
);

CREATE INDEX IF NOT EXISTS participants_client_token_idx ON participants (client_token);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'word_cloud', 'open_ended', 'scale')),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, participant_id, question_index)
);

CREATE INDEX IF NOT EXISTS votes_session_question_idx ON votes (session_id, question_index);

-- Enable Row Level Security (all access via service role from API routes)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anon read for realtime subscriptions on sessions
CREATE POLICY "anon can read active sessions" ON sessions
  FOR SELECT TO anon USING (status = 'active');

-- Service role bypasses RLS automatically
