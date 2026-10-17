status: shipped
attempted: ran dictionary-improvement workflow for ja/sv/es (limit 25), then charset-cleaned candidate files
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt (+3)
  - fe-next/backend/dictionary/candidates/sv.txt (+12)
  - fe-next/backend/dictionary/candidates/es.txt (+10)
  - fe-next/backend/dictionary/candidates/en.txt (+25, workflow default sweep — not in scope, left in place, harmless)
  - fe-next/backend/dictionary/candidates/he.txt (+16, workflow default sweep — not in scope, left in place, harmless)
languages_processed: ja, sv, es (target); en, he (workflow ran its own default full sweep alongside the requested langs)
candidates_added:
  ja: 3 (proposed 40, dual-judge kept 40, novel-vs-existing-file filter → 3 net new)
  sv: 12 (proposed 40, kept 40 → 12 net new)
  es: 10 (proposed 40, kept 40 → 10 net new)
form_violations_cleaned: 0 (ja/sv/es all passed charset regex — dual-judge pipeline already enforces script/charset per locale)
notes: candidates only, NOT added to live dictionary — backend verify->promote->heal pipeline gates promotion.
