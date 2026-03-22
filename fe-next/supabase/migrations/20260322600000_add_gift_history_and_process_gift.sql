-- Gift history table for tracking sent gifts
CREATE TABLE IF NOT EXISTS gift_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gift_type text NOT NULL CHECK (gift_type IN ('hints', 'streak_freeze', 'coins')),
  amount integer NOT NULL DEFAULT 1,
  cost integer NOT NULL DEFAULT 0,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for daily gift count lookups
CREATE INDEX idx_gift_history_sender_day ON gift_history (sender_id, created_at);

-- Index for recipient gift feed
CREATE INDEX idx_gift_history_recipient ON gift_history (recipient_id, created_at DESC);

-- Enable RLS
ALTER TABLE gift_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own sent and received gifts
CREATE POLICY "Users can read own gifts" ON gift_history
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Only server (service role) inserts via RPC
CREATE POLICY "Service role inserts gifts" ON gift_history
  FOR INSERT WITH CHECK (true);

-- Atomic gift transaction RPC
CREATE OR REPLACE FUNCTION process_gift(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_gift_type text,
  p_amount integer,
  p_cost integer,
  p_xp integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT total_coins FROM profiles WHERE id = p_sender_id) < p_cost THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  IF (
    SELECT COUNT(*) FROM gift_history
    WHERE sender_id = p_sender_id
    AND created_at >= date_trunc('day', now())
  ) >= 3 THEN
    RAISE EXCEPTION 'Daily gift limit reached';
  END IF;

  UPDATE profiles
  SET total_coins = total_coins - p_cost
  WHERE id = p_sender_id AND total_coins >= p_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to deduct coins from sender';
  END IF;

  IF p_gift_type = 'coins' THEN
    UPDATE profiles
    SET total_coins = total_coins + p_cost
    WHERE id = p_recipient_id;
  END IF;

  UPDATE profiles
  SET total_xp = total_xp + p_xp,
      lifetime_xp = lifetime_xp + p_xp
  WHERE id = p_sender_id;

  INSERT INTO gift_history (sender_id, recipient_id, gift_type, amount, cost, xp_awarded)
  VALUES (p_sender_id, p_recipient_id, p_gift_type, p_amount, p_cost, p_xp);
END;
$$;
