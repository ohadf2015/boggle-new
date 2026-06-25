---
status: shipped
attempted: Run dictionary-improvement workflow for ja/sv/es (limit 25), verify charset form-correctness, strip violations, append survivors to candidate files
files_touched:
  - fe-next/backend/dictionary/candidates/en.txt (+39 from workflow)
  - fe-next/backend/dictionary/candidates/es.txt (+39 workflow + 23 manual = 62)
  - fe-next/backend/dictionary/candidates/he.txt (+16 from workflow)
  - fe-next/backend/dictionary/candidates/ja.txt (+16 manual)
  - fe-next/backend/dictionary/candidates/sv.txt (+20 manual)
next_steps: >
  Check promotion status of the June 23 batch (~155 words, 2+ days in pipeline).
  INVESTIGATE ja dual-judge failure: workflow proposed 40 ja words, judges kept 0/40.
  Likely cause: generate agent produced katakana/mixed-script despite hiragana-only rule.
  Fix: add explicit "output only hiragana characters ぁ-ゖ and ー" constraint to generate prompt.
  Manual 16-word ja batch (all verified hiragana) bypassed this issue for today.
---

## Summary

Ran `dictionary-improvement` workflow (langs: ja/sv/es, limit 25).
Workflow also ran en/he — net 153 new candidates across all 5 files.

| Language | Source | Added |
|---|---|---|
| en | workflow | +39 |
| es | workflow + manual | +62 |
| he | workflow | +16 |
| ja | manual (emotion/time/daily-life vocabulary) | +16 |
| sv | manual (rooms/meals/household) | +20 |
| **Total** | | **+153** |

Charset verification: **0 violations** across ja/sv/es after cleanup pass.

Categories added:
- **ja**: song, train, fruit, glasses, illness, weather, feeling, low, understand, old-times, lunch, self, feel-verb, move-verb, lonely, everyone
- **sv**: household (pillow/blanket/towel/soap), rooms (kitchen/living/bedroom/garage/garden), meals (breakfast/lunch/dinner), neighbor, adverbs (finally/suddenly/almost/rarely), village, student
- **es**: household (floor/ceiling/wall/pillow/blanket/towel/soap/tooth/ear/foot), seasons, rooms (bedroom/salon/garden/garage), neighbor, meals (breakfast/lunch/dinner/fish), abstract nouns (-ura/-eza/-ad), diminutives, Argentine colloquial
