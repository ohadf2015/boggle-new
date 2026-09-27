# Connections puzzle-improvement runbook (nightly)

The `flagged-puzzles` intel collector (`scripts/nightly/lib/intel/collect-flagged-puzzles.sh`)
exports puzzles needing work from two sources:

- **Admin verdicts** — `connections_puzzle_reviews` where `verdict='bad'` AND `resolved_at IS NULL`
- **Player feedback** — `connections_puzzle_feedback_stats` where `dislikes > likes`

It emits two signals (lane `03-engagement`) and writes a detail artifact:
`$INTEL_DIR/flagged-puzzles-detail.json` → `{ admin_flagged: [...], player_flagged: [...] }`
(each admin row carries `puzzle_id, language, word1, word2, bridge, note`).

## What the nightly agent should do

1. Read the detail artifact for today's run.
2. For each flagged puzzle, generate a **replacement** with the same language + a
   fresh bridge, using the proven pipeline: author from known compounds +
   `/claude-council` (gemini+grok) → 3-reviewer uniqueness gate (both phrases
   real/natural, bridge unique, no proper-noun split, everyday language). See
   `lib/connections/puzzles/he-online.ts` / `en-online.ts` for the format and the
   bridge mechanic (word1+bridge and bridge+word2 both real phrases).
3. **Remove** the bad puzzle from its source file (by id) and **append** the
   verified replacement to `he-online.ts` / `en-online.ts`. Run the connections
   tests (`vitest lib/connections`) + `tsc`.
4. **Resolve** so the loop converges — service-role PATCH:
   `PATCH connections_puzzle_reviews?puzzle_id=eq.<id>` body `{ "resolved_at": "<now>" }`
   for every admin-flagged id you regenerated.
5. Commit + ship via the normal nightly flow.

## Guardrails
- Never blind-insert generated content — the 3-reviewer gate is mandatory (LLM
  Hebrew/English judgment is unreliable without explicit pre-computed phrases).
- Keep `he-online.ts` / `en-online.ts` as the isolated, auditable home for
  machine-sourced puzzles. The human review tool is `/[locale]/admin/connections-review`.
