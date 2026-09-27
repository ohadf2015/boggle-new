status: shipped
attempted: Run dictionary-improvement workflow for ja/sv/es (and en/he as bonus), dual-judge candidates, append survivors to candidate files, clean charset violations

## Results

| lang | proposed | kept (dual-judge) | added to candidates |
|------|----------|-------------------|---------------------|
| ja   | 35       | 18                | 18                  |
| sv   | 39       | 38                | 27                  |
| es   | 63       | 63                | 26                  |
| en   | 70       | 70                | 16 (bonus)          |
| he   | 40       | 40                | 17 (bonus)          |
| **total** | **247** | **229**       | **104**             |

## Charset cleanup
- ja: 0 violations removed
- sv: 0 violations removed
- es: 0 violations removed

## files_touched
- fe-next/backend/dictionary/candidates/ja.txt
- fe-next/backend/dictionary/candidates/sv.txt
- fe-next/backend/dictionary/candidates/es.txt
- fe-next/backend/dictionary/candidates/en.txt
- fe-next/backend/dictionary/candidates/he.txt

## next_steps
- Candidates await backend verify→promote→heal pipeline (Wiktionary/Jisho/milog + offensive filter) before reaching gameplay
- ja had lowest acceptance rate (18/35 = 51%) — future runs could bias toward more common everyday vocabulary
- Consider running again with higher `limit` (50) once pipeline processes this batch
