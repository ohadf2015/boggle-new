-- Web offerwall (ayeT-Studios) secure S2S coin grant.
--
-- The offerwall postback is server-to-server with NO user session, so the only safe
-- coin-credit path is this RPC, called by the service-role webhook AFTER it verifies
-- the HMAC signature. `transaction_id` is the idempotency gate: the unique INSERT and
-- the balance UPDATE run in one transaction, so a retried postback (ayeT retries 12×/h)
-- can never double-credit. Chargebacks (is_chargeback / negative amount / r-prefixed
-- txn) deduct, floored at 0. Modeled on `award_ad_coins`
-- (20260507000000_ad_watch_daily_cap.sql) — same row-lock + return-shape discipline.
--
-- NOTE: deliberately NOT added to the `supabase_realtime` publication (no consumer) —
-- see .claude/rules/50-supabase-perf.md (publishing a table with no subscriber serializes
-- WAL→JSON parsing on every write). This is an audit/idempotency table only.

-- 1. Idempotency + audit ledger.
CREATE TABLE IF NOT EXISTS public.offerwall_postbacks (
  transaction_id   TEXT PRIMARY KEY,                 -- ayeT transaction_id; idempotency key
  network          TEXT NOT NULL DEFAULT 'ayet',
  user_id          UUID,                             -- ayeT external_identifier = our profiles.id
  currency_amount  INTEGER,
  payout_usd       NUMERIC(12,4),
  is_chargeback    BOOLEAN NOT NULL DEFAULT FALSE,
  offer_id         TEXT,
  offer_name       TEXT,
  raw              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offerwall_postbacks_user
  ON public.offerwall_postbacks (user_id);

-- Service-role (webhook) writes this; no client ever reads it. RLS on with no policies
-- = locked to service-role (which bypasses RLS) and silences the Supabase RLS advisor.
ALTER TABLE public.offerwall_postbacks ENABLE ROW LEVEL SECURITY;

-- 2. Atomic, idempotent grant. Returns (success, deduped, new_balance, error_message).
CREATE OR REPLACE FUNCTION public.grant_offerwall_coins(
  p_transaction_id TEXT,
  p_user_id        UUID,
  p_amount         INTEGER,
  p_payout_usd     NUMERIC DEFAULT 0,
  p_is_chargeback  BOOLEAN DEFAULT FALSE,
  p_offer_id       TEXT    DEFAULT NULL,
  p_offer_name     TEXT    DEFAULT NULL,
  p_network        TEXT    DEFAULT 'ayet',
  p_raw            JSONB   DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success       BOOLEAN,
  deduped       BOOLEAN,
  new_balance   INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_rows     INTEGER;
  v_current  INTEGER;
  v_delta    INTEGER;
  v_new      INTEGER;
BEGIN
  -- Idempotency gate: a duplicate postback collides on the PK and inserts 0 rows.
  INSERT INTO public.offerwall_postbacks(
    transaction_id, network, user_id, currency_amount, payout_usd,
    is_chargeback, offer_id, offer_name, raw)
  VALUES (p_transaction_id, p_network, p_user_id, p_amount, p_payout_usd,
          p_is_chargeback, p_offer_id, p_offer_name, COALESCE(p_raw, '{}'::jsonb))
  ON CONFLICT (transaction_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    -- Already processed — return current balance, never re-credit.
    SELECT COALESCE(total_coins, 0) INTO v_current FROM public.profiles WHERE id = p_user_id;
    RETURN QUERY SELECT TRUE, TRUE, COALESCE(v_current, 0), NULL::TEXT;
    RETURN;
  END IF;

  -- Lock the profile row for the balance mutation (prevents concurrent races).
  SELECT COALESCE(total_coins, 0) INTO v_current
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Unknown user: postback row is kept (so retries stay deduped), but no credit.
    RETURN QUERY SELECT FALSE, FALSE, 0, 'Profile not found'::TEXT;
    RETURN;
  END IF;

  IF p_is_chargeback THEN
    v_delta := -ABS(p_amount);
  ELSE
    v_delta := p_amount;
  END IF;

  v_new := GREATEST(0, v_current + v_delta);

  UPDATE public.profiles
  SET total_coins = v_new,
      lifetime_coins_earned = CASE
        WHEN v_delta > 0 THEN COALESCE(lifetime_coins_earned, 0) + v_delta
        ELSE COALESCE(lifetime_coins_earned, 0)
      END,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, FALSE, v_new, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
