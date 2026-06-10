status: shipped
attempted: Generate 25 candidate words each for ja/sv/es, append to candidate files, clean charset violations

files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt

candidates_added:
  ja: +25 (293 → 318 lines; 0 charset violations)
  sv: +25 (273 → 298 lines; 0 charset violations)
  es: +25 (487 → 512 lines; 0 charset violations)

sample_words:
  ja: いけ(pond) くさ(grass) かわいい(cute) にじ(rainbow) ひまわり(sunflower) へび(snake) ちょうちょ(butterfly) ともだち(friend)
  sv: ägg(egg) potatis(potato) björn(bear) räv(fox) vår(spring) tåg(train) strand(beach) bro(bridge)
  es: puerta(door) estrella(star) montaña(mountain) playa(beach) barco(boat) baño(bathroom) mañana(tomorrow) tiempo(time/weather)

charset_violations_cleaned: 0 across all three files
verification: python3 charset regex ran clean — all additions comply with lang charsets (ja hiragana-only, sv a-zåäö, es a-zñ)

methodology: fallback manual generation (Workflow tool unavailable)
  - Deduplicated against existing candidates via grep before appending
  - All words are real, common standalone words in their target language
  - ja: avoided katakana loanwords; used native hiragana vocabulary (nature, animals, emotions, household)
  - sv: covered food, seasons, animals, urban vocabulary (previously weak areas)
  - es: covered furniture/home, food, geography, clothing (ñ words included: montaña, baño, niño, mañana)

next_steps: |
  - Run Wiktionary/Jisho/milog verify pipeline to promote candidates → live validation set
  - ja could expand into verb forms (e.g. たべる, のむ, あるく) on next run
  - sv compound nouns (sjöhäst, tallskog etc.) once simple words are promoted
  - es: add verb infinitives (comer, beber, hablar) on next run
