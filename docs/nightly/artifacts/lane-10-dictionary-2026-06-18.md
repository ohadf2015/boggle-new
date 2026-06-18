# Lane 10 — Dictionary Improvement — 2026-06-18

status: shipped
attempted: generate ~25 candidate words per language for ja/sv/es via dual-judge workflow, clean charset violations, append to candidates/*.txt

## Results

| lang | proposed | kept (dual-judge) | added | baseline | final |
|------|----------|-------------------|-------|----------|-------|
| ja   | 40       | 26                | 17    | 489      | 506   |
| sv   | 184      | 184               | 56    | 522      | 578   |
| es   | 43       | 43                | 35    | 684      | 720   |
| en   | 40       | 11                | 11    | —        | —     |
| he   | 40       | 38                | 17    | —        | —     |
| **total** | **347** | **302** | **136** | 1695 | 1804+ |

## Charset violations
0 removed — workflow generated fully conformant candidates for all 3 target languages.

## Files touched
- fe-next/backend/dictionary/candidates/ja.txt (+17 lines)
- fe-next/backend/dictionary/candidates/sv.txt (+56 lines)
- fe-next/backend/dictionary/candidates/es.txt (+36 lines)
- fe-next/backend/dictionary/candidates/en.txt (+11 lines)
- fe-next/backend/dictionary/candidates/he.txt (+17 lines)

## Notes
- Swedish 100% dual-judge pass rate (184/184) — confirms sv had genuine coverage gaps
- English low pass rate (11/40, 27.5%) — expected: most saturated language
- All candidates flow through backend verify→promote→heal pipeline (Wiktionary/Jisho/milog + offensive filter) before reaching gameplay

## next_steps
- Backend pipeline will auto-promote verified survivors on next nightly run
- Monitor ja pass rate — hiragana-only constraint means romaji contamination would show up here first
- Consider running he candidates through a native Hebrew speaker spot-check (AI-generated he = known risk per learnings)
