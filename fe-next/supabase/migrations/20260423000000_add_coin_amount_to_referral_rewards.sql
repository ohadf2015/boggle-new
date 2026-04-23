-- =============================================
-- Add coin_amount to referral_rewards so actual coin grants
-- from the referral system can be audited and summed for stats.
-- Previously only xp_amount was tracked; coins were promised in
-- the UI but never recorded or credited to the wallet.
-- =============================================

ALTER TABLE referral_rewards
  ADD COLUMN IF NOT EXISTS coin_amount INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referral_rewards_coin_amount
  ON referral_rewards(player_id)
  WHERE coin_amount > 0;

COMMENT ON COLUMN referral_rewards.coin_amount IS
  'Coins granted to referrer for this reward event. 0 for pure-XP legacy rewards.';
