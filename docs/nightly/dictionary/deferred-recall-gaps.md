# Dictionary recall gaps — deferred future work

Context: 2026-06-11 dictionary improvement pass. Spanish accent/ñ recall was fixed
(`backend/services/wiktionaryEsVerifier.ts` — opensearch title restoration). Two
other `not_found` buckets were diagnosed but **deliberately deferred** — each is a
bigger subsystem than the Spanish fix and carries false-accept risk in a scored
game, so each deserves its own scoped task, not a tail-end continuation.

## Swedish — compounds & rare terms (~8 real of 29 not_found)
Player-demanded `not_found` (submission_count≥2, len≥3) that are genuinely valid but
absent from en.wiktionary: `atomreaktor`, `älgbock`, `älgflock` (productive
compounds), `auskultation`, `attributiv`, `auditiv`, `autentisitet` (rare/technical).
Rest of the bucket is board-fragment junk (`nar`, `rut`, `tor`, `pet`…) or
misspellings (`auditörium`, `autentiskhet`).

- **Not** the Spanish gap: å/ä/ö are board-spellable letters, players type them
  correctly, the verifier keeps them — no diacritic fold-mismatch.
- Real fix = Swedish compound decomposition (split `älg`+`bock`, verify parts) or a
  second source (SAOL — Svenska Akademiens ordlista). Compound splitting has
  false-accept risk; needs care.

## Japanese — verb inflection (3 real of 8 not_found)
`あります` / `きます` / `いきます` = polite (-masu) forms of `ある` / `来る` / `行く`.
Jisho's API deinflects (returns the `ある` entry for query `あります`), but
`parseJishoResponse` requires an **exact reading match**, so the masu-form is
rejected. Other bucket members: `おたより` (valid noun — different gap, engine
wouldn't help), `をかし` (archaic), and typos `おしゃる`/`あにいさん`/`あままごと`
(should stay rejected).

- Safe fix = **forward** conjugation match (deterministic, no deinflection
  ambiguity): conjugate the dictionary forms Jisho returns into common forms using
  the verb class from Jisho POS tags, accept only on exact match.
- But a masu-only engine yields an *incoherent* dictionary (`あります` ok,
  `ありました` not). Doing it right = full conjugation table (godan rows × forms,
  ichidan, suru, kuru). If built, use a **maintained deinflector library**, never a
  hand-rolled table.

## Widening passes — diminishing-returns gotcha
Re-running the `dictionary-improvement` workflow is the safe "wider" lever (same
dual-judge gate, no new subsystem) — BUT it generates the *most common* missing
words first, so a second pass **against the same base file re-derives the same
words**. Observed 2026-06-11: a limit-110 es/sv/ja re-run produced byte-identical
additions to the limit-40 pass (it ran against a checkout that lacked the first
pass's words). To gain NEW coverage, run the next pass against a candidate file that
already contains the prior pass's words (forcing the model toward rarer vocabulary),
and expect lower judge keep-rates as words get rarer.
