status: shipped
attempted: dual-judge workflow (2 independent judges, both ≥0.75) for ja/sv/es, 25 candidates per language, dedup + charset clean

languages_processed:
  ja:
    generated: 11 (after workflow dedup)
    already_in_file: 8
    net_added: 3
    samples: あさり, あやうい, いきる
    file_lines: 794 (was 791)
  sv:
    generated: 25
    already_in_file: 20
    net_added: 5
    samples: trä, rad, lös, rött, djup
    file_lines: 766 (was 761)
  es:
    generated: 23
    already_in_file: 0
    net_added: 23
    samples: actriz, actor, alianza, amante, anillo
    file_lines: 1094 (was 1071)

charset_violations_cleaned: 0  # all files were already clean

files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt

next_steps: >
  ja/sv basic-word coverage is nearly saturated (8/11 and 20/25 dupes).
  Next run should target LESS COMMON vocabulary tiers: compound nouns,
  specific domain words (food, nature, emotions) that are genuinely
  standalone words. Consider prompting with a list of already-covered
  words so the generator avoids them, or switch to themed generation
  (e.g. "25 Japanese food/nature words in hiragana not on this list").
  es has room to grow — themed batches (emotions, household items) would add value.
