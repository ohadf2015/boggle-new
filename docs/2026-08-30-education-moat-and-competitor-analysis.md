# LexiClash Education — Competitor Analysis & Moat

**Date:** 2026-08-30
**Scope:** Where LexiClash Education actually differs from Blooket / Gimkit / Quizizz / Kahoot / Wordwall, what was blocking that difference from reaching a classroom, and what shipped today to unblock it.

---

## 1. The competitive field

| Product | Free tier | Paid | Core primitive |
|---|---|---|---|
| **Blooket** | Starter supports **60 players**, 27 named modes, student-led | < $5/mo billed annually | Question bank → multiple choice, wrapped in arcade modes |
| **Gimkit** | Basic: unlimited students on featured modes; **Pro-exclusive modes cap Basic hosts at 5 players**; ~3 rotating modes | **$14.99/mo · $59.88/yr** | Question bank → multiple choice + spaced repetition |
| **Quizizz** | **30 players**, limited question types | **$19.99/mo** individual teacher | Question bank → multiple choice |
| **Kahoot** | Synchronous whole-class quiz | tiered | Question bank → multiple choice, live only |
| **Wordwall** | **3 activities**, 12 templates, **0 multiplayer** | tiered | Template worksheets (match-up, anagram, wheel) |
| **LexiClash** | 3 classes × **10 students** | **$9/mo** | **Letter grid — the teacher's words are embedded in the board** |

### The one structural difference

Every competitor above is a **quiz engine**. The teacher authors questions; the student *recognises* the right answer among four. That is why the category's own comparison writing concedes that multiple-choice "does not test spelling as directly as typing does", and that classrooms needing something a multiple-choice question can't express reach for a second tool entirely.

LexiClash is not a quiz engine. A teacher supplies a **word list**, and the server generates a letter grid with those words physically embedded in it. The student has to *produce* the word — trace it letter by letter — not pick it. For vocabulary and spelling that is a categorically different assessment: recall and orthography instead of recognition.

**That is the moat.** Not "we have more modes" (Blooket has 27), not "we're cheaper" ($9 vs Gimkit's $14.99 is a discount, not a defence). The defensible claim is: *nobody else turns the teacher's own word list into the playfield.* Reproducing it means building a board generator, a multi-language solver, an anti-cheat server board, and a real-time engine — not adding a question type.

### The second, narrower moat

**Six languages including Hebrew (RTL) and Japanese, in the same engine.** Competitors are Latin-script-first; Wordwall hosts Hebrew community *content* but has no RTL game engine, and its free tier has zero multiplayer. A Hebrew or Japanese teacher who wants a live, competitive vocabulary game has no equivalent option. This is narrow, but it is genuinely unserved.

---

## 2. The problem: the moat was not reaching any classroom

The differentiator above was **built and disconnected**. Three separate breaks, all of the same shape — a value written by one path and read behind a condition the writer never satisfied.

### 2.1 The teacher's words never reached the board (root cause)

`ClassroomGameLobby` wrote the lesson (vocabulary, chosen game mode, timer, board size) into `sessionStorage` and navigated to
`/multiplayer?room=CODE&classroom=true&host=true`.

`useMultiplayerSession` read that data back **only when `?fromLesson=true` was present** — a URL parameter *nothing in the codebase ever set*.

Consequences, all silent:

- `HostView` never seeded `wordsForBoard` from the lesson → **the classroom board was a random board.** The single feature that distinguishes LexiClash from a quiz app did not run.
- `HostPreGameView` never seeded the teacher's game mode → the start emit carried `'random'` and the server rolled a mode. The teacher's choice was discarded.
- `ClassroomModeBanner` rendered with no lesson.

Only the results word-review card worked — because it read `sessionStorage` **ungated**. That asymmetry is exactly what made the bug invisible.

**Why no test caught it:** every downstream unit test passed `lessonData` as a *prop* (`HostPreGameView.classroomMode.test.tsx` asserts the teacher's mode seeds correctly — and it does, when handed the data). Green tests, dead feature.

### 2.2 The teacher's timer and board size were overwritten on mount

The setup wizard asks for both, then `HostPreGameView` unconditionally applied the `'fast'` preset (1 minute, MEDIUM) the instant it mounted. Every classroom game ran at 1 minute regardless of what the teacher chose.

### 2.3 Classroom results were teacher-only

The lesson recap was built from `lessonGameData` — the **teacher's own sessionStorage**. Students never have it. So in a room of 25 students, 25 of them saw no lesson recap at all, and `isClassroom` was `false` for every one of them.

---

## 3. What shipped

### 3.1 One module owns both ends of the handoff

`lib/education/classroomGameHandoff.ts` now exports **both** the URL the lobby navigates to and the predicate the session hook gates on, so they cannot drift apart again. The gate is `classroom=true` (what the lobby actually sets) plus the legacy `fromLesson=true` — deliberately *not* ungated, because `lessonGameData` outlives a classroom game that exits without passing through results, and a casual room opened afterwards would inherit the class vocabulary.

Its test asserts the two ends against each other rather than mocking either.

**Effect: the teacher's words are now actually on the board, and the teacher's chosen mode actually starts.**

### 3.2 Teacher-set Word Hunt target

A teacher can now pin the hunted word to one of their own lesson words — "today we're hunting NEUTRON" — instead of the game serving an unrelated dictionary word.

- `shared/utils/classroomHuntTarget.ts` is imported by **both** the picker UI and the server, so the client only offers what the server will accept, and the server re-validates anyway (a socket payload is never trusted).
- Ineligible words are refused **at pick time with a reason** (Word Hunt targets must be 5–7 letters). A silent fallback to a random target would mean the teacher sets a word, the class hunts a different one, and nobody learns why.
- On the server the pinned word takes the **embed** path, so it is guaranteed findable — and the rest of the lesson vocabulary is embedded alongside it rather than being displaced.
- If a lesson change strips the pinned word, the picker clears it rather than sending a target the server would silently replace.

### 3.3 Classroom results, for the whole class

New server module `backend/modules/classroomSummary.ts` builds the lesson recap and ships it inside the **shared `validatedScores` payload** — the one every player already receives, and which reconnecting clients restore from `cachedResultsPayload`.

`components/education/ClassroomResultsCard.tsx` renders it for two audiences from one payload:

- **A student** sees their own hits and misses against today's words, and a one-tap route into flashcard practice.
- **The teacher** sees class-wide coverage, how many students found each word, and an explicit **reteach list** — the words *nobody* in the room found.

Exit routing was also split: the teacher returns to `/education`; students no longer get dumped on the teacher landing page.

### 3.4 The teacher's timer and board size now survive

`lib/education/classroomHostPreset.ts` maps the wizard's vocabulary (board *size*, minutes) onto the host controls' (board *difficulty*, minutes), and the `'fast'` preset now only fires for non-classroom rooms.

Making that pick load-bearing exposed a label bug it had been hiding: the buttons read "Small (4×4) / Medium (5×5) / Large (6×6)" while `DIFFICULTIES` is 5×5 / 6×6 / 7×7. While the preset was overwriting the choice the wrong label was harmless; now it would hand the teacher a board one size off what the button promised. Corrected in all six locales.

### 3.5 Minimum word length — the grade-level dial

A second teacher-configurable setting, on every mode: the shortest word that scores (2–5 letters). A second-grade class and a tenth-grade class want very different floors, and the plumbing for it already ran end to end — it was just hardcoded to 3.

### 3.6 Three defects the recap would otherwise have shipped with

Both were found by review, not by tests, and both would have corrupted the reteach list — the most valuable output of the whole feature.

**Bots counted as students.** Bots are in the results payload by design (their words show in results), so a bot finding a lesson word would list it under `foundBy`, credit it to `classFoundCount`, and **remove it from the reteach list** — telling the teacher the class knew a word no student had found. Now filtered on `game.users[username].isBot`, with a bot fixture asserting the word stays on the reteach list.

**On desktop, guests never saw the recap.** The desktop results layout gated the lesson card on `!isGuest`. That gate exists to hide account-gated content — but a classroom student is account-less *by design*: they join with a code and a name. So on the classroom's main screen, the lesson recap was hidden from precisely the people it is for. (Mobile never gated it — another asymmetric path.) Guest-gating now happens in one place, and the classroom recap is exempt; the legacy non-classroom card keeps its gate.

**Hebrew words never matched.** Words traced off the board arrive normalized (finals ם/ן/ך/ף/ץ collapsed to base letters); lesson vocabulary is stored in natural form. A plain uppercase compare reported "nobody found it" for every Hebrew lesson word ending in a final letter, even when the whole class found it. This is the same asymmetric-compare shape as the handoff gate, and it would have broken exactly the RTL claim this document leads with. Both sides now go through `normalizeWord(word, language)`; display still uses the teacher's natural form.

---

## 4. Honest read: what still holds us back

### The free tier is the least competitive number in the table

LexiClash free: **10 students per class**. Blooket free: **60**. Quizizz free: **30**. Gimkit free: unlimited on featured modes.

A real class is 25–30 students. Our cap binds *before the first lesson finishes* — and `lib/education/freeTierLimits.ts` states the cap is intentional ("the upsell — do not widen"). Against this field, a 10-student cap does not read as an upsell; it reads as "this tool does not work for my class", which is the same conclusion as "this tool is bad".

This is consistent with the observed funnel: teachers sign up, create nothing or create once, and **nobody is active on a second day**. Prior analysis established that friction was never the blocker — the create flow is 3 clicks and 1 field, and 33 of 35 teachers still made nothing. A cap that fails on the first real class is a better explanation than friction.

**Recommendation (business decision, not made here): raise the free cap to at least 30 students per class and move the paywall to teacher-scale features** — multiple classes, historical reporting, curriculum packs, exports. Charge for the *teacher's* workflow, not for the students' ability to be in the room. Every competitor in the table has already concluded that capping the room is the wrong lever.

### Marketing still contradicts the product

Education marketing promises "free forever / no cap" in 140+ places while the code enforces 3 classes × 10 students and a $9/mo Pro tier. `llms.txt` repeats the same claim to AI assistants. This is guarded by `educationClaims.test.ts`, but the contradiction is not resolved — either the copy or the cap has to move, and the recommendation above resolves both at once.

### Positioning is still generic

The current pitch is interchangeable with Blooket's. It should lead with the two things that are actually hard to copy:

1. **"Your words become the board."** Students spell them, not spot them.
2. **"Works in Hebrew, Japanese, Spanish, Swedish, Russian and English — RTL included."**

---

## 5. Verification

- `lib/education/classroomGameHandoff.test.ts` — the lobby's real URL satisfies the session hook's real gate (the test that would have caught the original bug).
- `shared/utils/classroomHuntTarget.test.ts` — eligibility band, lesson membership, tampered-payload refusal.
- `backend/modules/__tests__/classroomSummary.test.ts` — coverage, missed words, per-player mastery, duplicates credited, rejected words excluded, **bots excluded from the reteach list**, **Hebrew final-letter normalization on both sides of the compare**.
- `components/education/__tests__/ClassroomModeSettings.test.tsx` — target picker only offers hunt-eligible lesson words; clears a pin the lesson no longer contains; minimum-word-length selection.
- `components/education/__tests__/ClassroomResultsCard.test.tsx` — student view vs teacher view from the same payload.
- `lib/education/classroomHostPreset.test.ts` — size→difficulty and seconds→minutes mapping.

Full suites: backend **3383 passed** (`npm run test:backend`, rc 0), frontend education/host/views/multiplayer/app **2370+ passed, 0 failed**, `tsc --noEmit` clean, `eslint` clean on all touched files, `npm run build` green.

### Not verified here

The end-to-end path was **not** exercised against a live browser with a real teacher account and a second student client. The wiring is covered by unit tests at both ends of each seam, and typechecks, but "a teacher launched a classroom Word Hunt and 25 students saw the recap" has not been observed running. That is the next check worth doing.

---

## Sources

- [Blooket vs Gimkit vs Kahoot (2026): Honest Comparison — TriviaMaker](https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/)
- [10 Best Gimkit Alternatives for 2026 – Free & Pro Plans Compared — TriviaMaker](https://triviamaker.com/gimkit-alternatives/)
- [10 Best Blooket Alternatives (2026) — TriviaMaker](https://triviamaker.com/blooket-alternatives/)
- [Blooket vs Gimkit: Which Classroom Game Wins? [2026] — LearnClash](https://learnclash.com/blog/blooket-vs-gimkit)
- [7 Best Wordwall Alternatives for Interactive Activities (2026) — SpellingJoy](https://spellingjoy.com/best-apps/wordwall-alternatives)
- [Create Gamified Interactive Reviews with Wordwall — Eductive](https://eductive.ca/en/resource/create-gamified-interactive-reviews-with-wordwall/)
- [Blooket vs. Gimkit: Which Is Better for Your Classroom? — Differentiated Teaching](https://www.differentiatedteaching.com/blooket-vs-gimkit/)
