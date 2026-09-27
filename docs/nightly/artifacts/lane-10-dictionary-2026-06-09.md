status: shipped
attempted: Generate ~25 candidate words each for ja/sv/es, append to candidate files, clean charset violations

files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt

candidates_added:
  ja: +22 (271 → 293 lines; 0 charset violations)
  sv: +25 (248 → 273 lines; 0 charset violations)
  es: +24 (463 → 487 lines; 0 charset violations)

sample_words:
  ja: きのこ(mushroom) うさぎ(rabbit) こおり(ice) むらさき(purple) さかな(fish) くも(cloud) おんな(woman)
  sv: orm(snake) häst(horse) hjärta(heart) sjö(lake) dörr(door) mössa(hat) vägg(wall)
  es: pez(fish) raiz(root) niebla(fog) cuchara(spoon) puente(bridge) pluma(pen) roca(rock)

charset_violations_cleaned: 0 across all three files
verification: python3 charset regex ran clean — all additions comply with lang charsets

next_steps: |
  - Workflow tool (dictionary-improvement) unavailable; used fallback manual generation
  - Run Wiktionary/Jisho/milog verify pipeline when available to promote candidates → live validation set
  - ja could benefit from more 4-5 mora words (current additions skew 2-3 mora)
  - sv could add compound nouns once verify pipeline confirms simpler words first
