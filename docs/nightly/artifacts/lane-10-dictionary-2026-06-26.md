status: shipped
attempted: run dictionary-improvement workflow for ja/sv/es (25 candidates each), dual-judged, clean charset violations

files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt (+40 candidates)
  - fe-next/backend/dictionary/candidates/es.txt (+32 candidates)
  - fe-next/backend/dictionary/candidates/he.txt (+13 candidates)
  - fe-next/backend/dictionary/candidates/sv.txt (+0, dual-judge kept 0)

results:
  ja: proposed 40, survived dual-judge 40, added 40
  es: proposed 66, survived dual-judge 62, added 32
  he: proposed 47, survived dual-judge 47, added 13
  sv: proposed 27, survived dual-judge 0, added 0 (subagent StructuredOutput failure)
  en: proposed 40, survived dual-judge 0, added 0 (subagent StructuredOutput failure)
  total_added: 85

charset_cleanup:
  ja: 0 violations removed (659 lines clean)
  sv: 0 violations removed (687 lines clean)
  es: 0 violations removed (966 lines clean)

next_steps:
  - sv/en got 0 survivors due to StructuredOutput subagent failure — retry both next run
  - he candidates are hiragana-clean but native review recommended before promotion
