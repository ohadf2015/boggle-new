# Evidence Pack: Kahoot Teacher Dashboard & Live Game Experience
Design-reference research for rebuilding the LexiClash education module. Compiled 2026-09-29 from public sources only (no Kahoot login). Local screenshots in `images/` (App Store listings: Kahoot, Quizizz/Wayground, Duolingo).

---

## 1. Kahoot Teacher Dashboard — Layout & Navigation Model

**Nav model: compact top bar, destination-based (not sidebar).** Confirmed by Kahoot's own 2018 redesign post and help-center/starter-guide docs:

- **Top nav destinations:** `Discover` (search public games) · `Kahoots` (your content) · `Reports` (game data) · prominent **`Create`** button. Account settings hide under a gear icon.
- **Inside "Kahoots":** left-hand sub-sidebar with three lists — `My kahoots`, `Favorites`, `Shared with me`. Folders organize by topic/subject.
- **Kahoot cards:** big `Play` and `Challenge` (assign) buttons kept "in the spotlight"; duplicate/edit/share demoted to a three-dots menu. The two verbs that matter get the pixels — a strong "one primary action per card" lesson.
- **Home page:** personalized (added 2019) — past quizzes, player reports, account settings; class-level analytics surfaced after login.
- **Groups/Teams:** sharing via Google Classroom, MS Teams, Apple Schoolwork; workspace sharing on EDU plans.

**Creation flow ("Create" → Kahoot! creator):**
- Template start or blank; question bank of 500M+ questions; blend questions from multiple kahoots; spreadsheet (.xlsx) import; AI generation (create-only).
- Question-type picker grouped by intent (seen in App Store screenshot `kahoot-2.png`): **"Test knowledge"** (Quiz, True/False, Puzzle, Type answer, Quiz+Audio, Slider) vs **"Collect opinions"** (Word cloud, Poll, Open-ended, Brainstorm, Drop pin). Grouping types by *pedagogical intent* rather than alphabetically is worth stealing.
- Media: image library, YouTube embeds.

**Host/assign split is one decision on the kahoot page:** `Play` (live) vs `Challenge/Assign` (student-paced, deadline). Same content object, two delivery modes.

---

## 2. Live Game Experience — What Makes It Energetic

Flow (from help-center docs + teacher guides):

1. **Lobby:** host screen shows a big **game PIN**; players join at **kahoot.it** (no account) with nickname (optional nickname generator for appropriateness). Names pop onto the lobby screen as they join; iconic **lobby music** builds anticipation (Kahoot even rotates seasonal lobby tunes — they treat music as a product surface).
2. **Question screen (host/TV):** question text + image/video + 4 answer tiles. **Player devices show ONLY colored shapes** — red triangle, blue diamond, yellow circle, green square. The shared screen carries content; the personal screen carries the action. This "eyes-up, hands-down" split is the core engagement trick: everyone watches the same screen, phones become buzzers.
3. **Scoring:** correctness + speed. Between questions: distribution stats (how many picked each answer) → **top-5 leaderboard**. Crescendo pacing: leaderboard moments are the dopamine beats between questions.
4. **Podium:** top-3 on a gold/silver/bronze podium graphic at game end — replayable/shareable from the report. Gives the session a *ceremony*, not just an end.
5. **Host controls:** classic (individual) vs team mode; answer streaks bonuses; music toggle.

**Why it reads as "energetic":** synchronized rhythm (everyone answers the same question on the same timer), compressed feedback loops (answer → instant distribution → leaderboard), speed-weighted scoring (rewards reflexes, keeps everyone in it), shape/color abstraction (works at 2 meters on a projector and on any phone, no reading required at the device), and audio as pacing device (question music tempo = tension curve).

---

## 3. Reports & Analytics

**Report structure (4 tabs):** `Summary` · `Players` · `Questions` · `Feedback` (per help-center + university guides).

- **Summary:** avg score, # participants, # questions, session duration, mode, date, host; **"view and share podium"**.
- **Actionable insights at bottom of report:**
  - **Difficult questions** — flags questions <35% correct; if >3 such questions, a **`Create` button auto-generates a follow-up kahoot from exactly those questions** (report → remediation loop closed in-product — excellent pattern).
  - **Need help** — which participants to follow up with.
  - **Didn't finish** — incomplete participants.
- **Exports:** spreadsheet download, save to Google Drive; sort by date/title/player count.
- **Paid-tier analytics:** course reports, **combine reports** (class progress over time), **player identifier** (track one student across multiple kahoots).

**Key gap:** without player-identifier (paid) Kahoot is fundamentally *session-snapshot* analytics — each game is an island. No native longitudinal per-student mastery view.

---

## 4. Engagement / Motion / Palette Patterns

**Kahoot palette (documented brand values):**
- Primary purple: `#46178F` (deep purple, brand/UI)
- Answer colors: red `#E21B3C`, blue `#1368CE`, yellow `#FFA602`, green `#26890C` — each bound to a shape (triangle/diamond/circle/square) so color-blindness has a redundant channel. **Color + shape pairing = accessibility-safe competitive color-coding** (directly relevant to our lime/pink/cyan/purple mode colors — add a shape/pattern channel per mode).
- Typography: rounded geometric sans (Montserrat family), heavy weights, white on saturated fills.

**Duolingo micro-interactions (borrowable for a word-game classroom product):**
- **Streaks:** flame + weekly calendar; idle slow pulse → faster, higher-saturation `--at-risk` animation when today's practice is missing. Loss aversion is the engine ("a 365-day streak creates enormous loss aversion"); streak-freeze monetizes the anxiety *and* prevents rage-quit.
- **Layered progress:** XP bar + crowns + leagues + streak + badges overlap so *something always advances, even on bad days*. Progress bar still inches forward after wrong answers — never let a student feel stuck.
- **Leagues:** weekly competitive tables (purple-coded), position-at-stake pressure.
- **Feedback banners:** correct → green "Great!" + positive sound + immediate CONTINUE; wrong → gentle red banner *showing the correct answer*, soft sound, "GOT IT", 200ms slide-up — "firm but not scary." Lessons end on an easy win (recency-effect reinforcement).
- **Tactile buttons:** 4px bottom border that disappears on press while the button drops 4px — physical click simulation; 16px radii, uppercase 700 labels, 300ms progress-bar fills.
- **Color semantics:** green `#58cc02` success/CTA, red `#ff4b4b` mistakes/hearts, orange streaks, yellow XP, purple leagues/premium, blue info. One saturated color = one meaning, consistently.
- **Character as relationship vector:** Duo the owl has ~9 emotional states mapped to user state (happy/sad/crying/"dead") — makes pushy notifications charming and meme-able. (LexiClash's kawaii mascot can play the same role in classroom contexts: celebrate streaks, mourn broken ones.)

---

## 5. Teacher Complaints About Kahoot (from reviews)

Sources: Brighterly review round-up, Trustpilot, G2/Reddit threads summarized in comparison posts.

- **Pricing walls:** best question types (open-ended, puzzle, brainstorm) and player limits behind paid tiers; free tier caps at ~10 participants on basic; tier confusion ("unsure which plan they actually need"); reports of paid accounts still needing upgrades; cancellation friction on Trustpilot. Pricing rated 6/10.
- **Analytics depth:** "No personalized learning path," "limited progress tracking," "minimal feedback beyond correct/incorrect." No error-correction loop — wrong answers get no guided explanation.
- **Pedagogy doubt:** participation "skyrockets to 100%" but retention doesn't follow — one teacher quit because students "don't remember the material as exams show later." Speed-weighted scoring rewards guessing fast.
- **Clutter/perf:** minor but recurring — UI elements cluttered, occasional hiccups on certain devices.

**Design takeaway:** Kahoot wins the *moment*, loses the *arc*. Its moat is live energy; its open flank is longitudinal learning evidence. A competitor product should keep Kahoot-grade live energy and beat it on per-student progress, guided correction, and honest (not paywalled) core features.

---

## 6. Quizizz (now Wayground) — Dashboard Basics & Differentiators

**Nav model (left sidebar):** purple **`+ Create`** button top-left (entry to: import questions / AI generate / from scratch) · `Explore`/Library (community content) · `My Library` · `Reports` ("My Reports") · `Classes` (manual or LMS-imported rosters). Card grid with subject filter chips (`kahoot`-style top search bar on mobile).

**Creation:** settings (title, subject, grade) → add questions (import/AI/manual) → customize game layer (themes, music, **memes**, leaderboard toggle, timer toggle, power-ups) → publish → share via link/code/LMS. 8+ question types incl. open-ended, fill-in-blank, multi-select.

**Where reviewers say Quizizz beats Kahoot:**
1. **Per-student longitudinal tracking:** participant-level dashboard; accuracy over time; topic-tagged questions so each learner is tracked *across topics and across sessions*; paid tiers add standards alignment and historical growth reports across multiple assignments. Kahoot's equivalent (player identifier + combine reports) is a paid bolt-on; Quizizz makes the student, not the session, the analytics unit.
2. **Mastery/spaced repetition:** "Adaptive Question Bank" re-serves questions learners missed (spaced repetition built in); **answer explanations** teach the reasoning after each question — closes the error-correction loop Kahoot leaves open.
3. **Homework mode parity:** student-paced assignments with deadlines and auto-grading as a first-class citizen, not a "challenge" side-feature.
4. **Configurable pressure:** leaderboards, timers, and memes are *toggles* — teacher can de-gameify for anxious students.
5. **Free tier generosity** and LMS integrations (rostered groups, results sync) vs Kahoot's limited LMS integration.
6. **AI both creates AND enhances** (adapt reading level, translate, generate similar questions — visible in `quizizz-2.png` "Enhance with AI" menu: Translate to Spanish / Generate Lesson / Add similar questions).

---

## 7. Image Evidence (downloaded to `images/`)

From public App Store listings (Apple iTunes API, full-res):
- `kahoot-1/2/3.png` — Kahoot app: home/create flow; `kahoot-2.png` shows the intent-grouped question-type picker.
- `quizizz-1/2/3.jpg` — Wayground app: explore/library with subject chips, AI-enhance menu, resource cards.
- `duolingo-1…5.jpg` — Duolingo app: lesson screen with green progress bar + streak/energy counter, character speech-bubble coaching, chunky CTA.

**Not downloadable** (2026-09-30 re-fetch of the Host live article returned a bot wall, "Just a moment…", same as the earlier 403) — capture manually later:
- `https://support.kahoot.com/hc/en-us/articles/360035063054` — report Summary/Difficult-questions screenshots
- `https://support.kahoot.com/hc/en-us/articles/360035547493` — spreadsheet report screenshots
- Host-screen / podium / kahoot.it join screen shots: search "kahoot podium screenshot", "kahoot lobby game PIN" — kahoot.com/files StarterGuide PDF (`https://kahoot.com/files/2021/06/StarterGuide_0621.pdf`) embeds official UI captures.

---

## 8. What Best-in-Class Looks Like in 2026

Ten bullets a critic can judge against:

1. **Two-speed product:** live host mode with Kahoot-grade ceremony (lobby music, leaderboard beats, podium finale) AND first-class student-paced assignments with deadlines — equal citizens, one content object.
2. **Student is the analytics unit:** per-student longitudinal dashboard — accuracy over time, per-topic mastery, growth across sessions — free, not paywalled. Session reports remain but roll up into the student arc.
3. **Report → remediation loop in-product:** difficult-question detection auto-generates a follow-up activity (Kahoot does this) AND missed words re-queue via spaced repetition (Quizizz does this) — do both.
4. **Error correction, not just scoring:** every wrong answer gets a gentle, immediate explanation or re-teach moment (Quizizz explanations, Duolingo's "firm but not scary" banner) — never red-X-and-move-on.
5. **Shared screen / personal device split:** big screen carries content and ceremony, devices are simple buzzers; works on projector, TV, and laptop simultaneously; join in <10 seconds via PIN, no student accounts required.
6. **Color + shape redundancy:** competitive color-coding always paired with a shape/icon channel (Kahoot's four answer shapes) so energy never costs accessibility.
7. **Layered progression so something always advances:** XP + streaks + weekly class league + badges, with progress that still inches forward on bad days and streaks that can be saved (freeze) — loss aversion without rage-quit.
8. **Teacher-controlled pressure dial:** timer, leaderboard, speed-scoring are toggles per activity — the same game can run as a hyped game-show or a calm mastery check.
9. **Mascot as emotional layer:** a character with real emotional states (celebrates streaks, mourns broken ones, cheers podium moments) woven into notifications and celebrations — personality that makes retention mechanics charming instead of pushy.
10. **AI that enhances, not just generates:** adapt existing content (reading level, translation, similar questions, auto-tagged topics for mastery tracking) — one click from any resource, visible in the library, not buried in a wizard.
