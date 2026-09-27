---
status: shipped
attempted: Generate 25 candidates per lang for ja/sv/es via dual-judge workflow, append survivors, clean charset violations, deduplicate
---

## Results

| Lang | Baseline | Generated | Survived dual-judge | Net new unique |
|------|----------|-----------|---------------------|----------------|
| ja   | 821      | 25        | 25/25               | +1             |
| sv   | 800      | 162       | 158/162             | +24            |
| es   | 1125     | 25        | 21/25               | +1             |

## Notes
- All 3 files passed charset validation (0 violations: ja=hiragana-only, sv=a-zåäö, es=a-zñ)
- High dupe rate (ja: 24/25, es: 20/21 generated = already in file): ja/es dictionaries already have strong common-vocab coverage
- sv had most headroom — generated 162 (workflow over-generated), 158 survived, 24 net new
- Deduplication removed: ja=24, sv=134, es=20 duplicate lines (mix of pre-existing + new)

## Files touched
- fe-next/backend/dictionary/candidates/ja.txt (821→822 lines)
- fe-next/backend/dictionary/candidates/sv.txt (800→824 lines)
- fe-next/backend/dictionary/candidates/es.txt (1125→1126 lines)
- docs/nightly/artifacts/lane-10-dictionary-2026-07-26.md

## Next steps
- ja/es are saturated at common vocab — next run should target UNCOMMON but valid words (N3/N4 JLPT for ja; B1-level es nouns/verbs)
- sv net gain good; could target compound nouns or sports/food vocabulary next run
- Consider seeding generate prompt with "words NOT in this list: [existing sample]" to reduce dupe rate
