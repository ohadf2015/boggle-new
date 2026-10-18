status: shipped
attempted: ran dictionary-improvement workflow (dual-judge) for ja/sv/es; workflow default-scoped to en/he/sv/ja/es
files_touched:
  - fe-next/backend/dictionary/candidates/en.txt (+16 after cleanup, 17 proposed-added, 1 dropped)
  - fe-next/backend/dictionary/candidates/he.txt (+20)
  - fe-next/backend/dictionary/candidates/sv.txt (+5)
  - fe-next/backend/dictionary/candidates/ja.txt (+12)
  - fe-next/backend/dictionary/candidates/es.txt (+17)
candidates_added_per_lang: en=16 he=20 sv=5 ja=12 es=17 (total 70, after charset cleanup)
form_violations_cleaned: 1 — "ain't" dropped from candidates/en.txt (apostrophe violates ^[a-z]+$)
notes: words are CANDIDATES only, not added to the live dictionary; backend verify->promote->heal pipeline gates promotion. No validation-set/backend/translation files touched.
next_steps: none pending; re-run next cycle for weakest-coverage langs per brief once intel layer has signal for lane 10.
