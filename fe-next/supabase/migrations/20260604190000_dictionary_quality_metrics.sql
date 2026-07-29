-- Dictionary quality metrics — per-language snapshots feeding the auto-improve
-- loop's SLA dashboard and the monotonic-quality gate.
-- See docs/2026-06-04-dictionary-extensive-improvement-spec.md §6–§7.
--
-- recall_at_gold  : fraction of known-valid gold words present in the live dict.
-- precision_sample: fraction of a re-verified accepted sample that still holds.
-- The proactive-discovery job reads the trailing precision baseline from here and
-- refuses to widen a language if precision would regress (qualityGate).

create table if not exists public.dictionary_quality_metrics (
  id               uuid primary key default gen_random_uuid(),
  language         text not null check (language in ('en','he','sv','ja','es')),
  measured_at      timestamptz not null default now(),
  dict_size        integer,
  recall_at_gold   numeric(6,4),
  precision_sample numeric(6,4),
  false_reject_rate numeric(6,4),
  promotion_velocity integer,
  garbage_flagged  integer,
  gold_valid_n     integer,
  gold_invalid_n   integer,
  notes            text
);

-- Time-series reads are per-language, newest-first.
create index if not exists idx_dict_quality_lang_time
  on public.dictionary_quality_metrics (language, measured_at desc);

-- Locked to service role: written by the backend cron, read by ops dashboards.
-- RLS on + no policies = no anon/auth access; service role bypasses RLS.
alter table public.dictionary_quality_metrics enable row level security;

comment on table public.dictionary_quality_metrics is
  'Per-language dictionary quality snapshots (recall@gold, precision@sample). '
  'Feeds the auto-improve loop quality gate. ~1y retention. '
  'Spec: docs/2026-06-04-dictionary-extensive-improvement-spec.md';
