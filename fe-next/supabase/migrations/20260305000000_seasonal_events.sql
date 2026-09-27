-- Seasonal/Limited-Time Events Framework
-- Tables for managing time-limited events with leaderboards and rewards

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('tournament', 'holiday', 'weekend', 'special')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  rewards JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Event participation table
CREATE TABLE IF NOT EXISTS event_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewards_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_event_participation_event_id ON event_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_user_id ON event_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_score ON event_participation(event_id, score DESC);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;

-- Everyone can read events
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

-- Only admins can insert/update events
CREATE POLICY "events_admin_insert" ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "events_admin_update" ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Users can read all participation, insert their own
CREATE POLICY "participation_select" ON event_participation FOR SELECT USING (true);
CREATE POLICY "participation_insert" ON event_participation FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "participation_update" ON event_participation FOR UPDATE USING (
  auth.uid() = user_id
);
