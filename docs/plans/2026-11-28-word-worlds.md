# Word Worlds: learning that sticks (plan, 2026-11-28)

Owner ask: more animated worlds like the student academy map; word gameplay that really teaches, fun, "not just basic".

## What is broken today
- A lesson word is "mastered" the first time a student finds it in a live game, and never loses it.
- The spaced-review table (`word_review_state`) is never written; the review run uses a separate localStorage schedule, so the badge and the run disagree.
- Solo practice never updates word mastery. Most modes are recognition (pick from 4); only "produce" asks for free recall.
- One painted world; nothing changes on the map as words are learned.

## 1. One memory per word (engine)
- Every answer from every mode (practice, review, live quiz, live board finds) records a review for that student and word: correct or not, how (recognise / recall / spell / use), response time.
- Schedule: spaced intervals (SM-2 style on `word_review_state`), with harder tasks moving a word further. Wrong answers come back later in the same session and sooner next time.
- Word strength, five stages shown to students: Seed (new), Sprout (seen), Plant (recalled once), Flower (recalled on two different days), Gold (recalled after a 7+ day gap). A due word that is not reviewed wilts one stage.
- Mastery for teachers and the boss unlock use this strength, not "found once". Old `words_mastered` stays readable for history.
- One schedule only: the localStorage Leitner box and the review badge both read the server state.

## 2. Daily quest (5 minutes)
A short mixed session built from the student's own words: 1-2 new words to meet, the due words, then a recall ladder. Each word climbs: recognise meaning, pick it in a sentence, spell it from its meaning, use it. Interleaved, never the same task twice in a row.

## 3. New games (each teaches one thing)
- **Word Detective** (guess meaning from a context sentence, then reveal with picture): learning from context.
- **Fill the sentence** (build the missing word from letter tiles, meaning hint, hint costs a star): recall plus spelling in context.
- **Word Garden** (each word is a plant at its strength stage; quest waters the ones due): makes forgetting and review visible.
- **Boss** (type the word from its meaning to attack; combo doubles; class damage adds up): free recall under light pressure, uses only due and weak words.
Existing modes stay; flashcards, matching and vocab focus feed the same engine.

## 4. Worlds
- A world per lesson theme (Jungle Animals, Frost Peaks, Desert Ruins, the current castle world as default; more later). Theme picked from the lesson topic, teacher can change it.
- Each island starts grey and misty and comes alive as its words grow (waterfall flows, flowers, birds, sparkles). The landmark at the top opens with the boss.
- Same engine as today's map: art per world and orientation, measured island slots, ambient layers (clouds, waterfalls, creatures) with reduced-motion fallbacks.

## 5. Build order
1. Engine + one schedule + teacher mastery from strength (no visible change except correct counts).
2. Daily quest + Fill the sentence + Word Detective.
3. Word Garden view and restore states on the current world.
4. New worlds (art, slots, ambient), then Boss.
Each step ships separately with tests and before/after screenshots.

## Data gaps
- Not every word has a definition and example sentence. Plan: fill missing fields with the existing AI enrich step when a lesson is saved, and skip a game for a word that lacks what it needs.
- Picture clues need images per word: generate on demand later; start without.
