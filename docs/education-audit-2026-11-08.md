# Education module audit — 2026-11-08

Static read of origin/master (92dbf9273). Nothing was run in a browser; items marked [U] are unverified.
Six parallel audits: teacher IA, practice-before-class, edu/game separation, student + join, UI/neo debt, competitor research.

## Headline

The first-session path is already short (6 screens, ~8 clicks, one real decision: a class name). The pain is everything around it: Home has 22-28 interactive elements, results live in 5 places, one concept has 6 names, the lobby hides ~15 options, and practice means two different things. Separation is chrome-deep only: root layout, providers, analytics, PWA and SEO identity are shared with the consumer game.

## P0

1. **Pixels/analytics on student routes.** `components/SocialMediaPixels.tsx` has no consent/route/edu gate; it fires wherever the FB/TikTok env vars are set. LogRocket replay identifies students by name/email on `/join` and `/student` (`essential-providers.tsx:162-175`, `useLogRocketIdentify.ts:64-123`). Confirm the `SiteExtras` mount and prod env [U]; then gate everything off `eduSectionOf() !== null`.
2. **Google Classroom add-on over-promises.** Listing advertises grade passback (`googleClassroomAddon.ts:381-401`) but no sync exists; `miss-gap-grade-passback` reads points from the query string, so a receipt is forgeable (`page.tsx:30-60`). Pull the claim, or build it.
3. **Reports: three entry points, two Pro walls.** `/teacher/reports` (5 tabs), `/teacher/classroom/[id]/analytics` (5 tabs), Home "Weekly reports" dialog. Reports is a primary tab that is a pure upsell for free teachers (`reports/PageClient.tsx:409-428`). Homework results hide under kebab "Class report".
4. **Double top safe-area inset on phones (likely the "gap on top").** `body.screen-fit` pads `--combined-safe-area-top` (`globals.css:3048`); `EducationShellNav.tsx:65` adds `max(0.5rem, env(safe-area-inset-top))` again; `body.edu-shell-locked` (`globals.css:3077`) does not undo the top padding. ~47-59px extra on notched/PWA phones [U: not measured]. Fix = `body.edu-shell-locked { padding-top: 0 }` only after confirming every locked screen has a top owner (student screens use sticky `EducationHeader`, `EducationHeader.tsx:154-160`).

## P1

- **Practice run.** Phone: iframe `hidden lg:flex` still loads, seat joins invisibly and round auto-starts (`PracticeRunPanel.tsx:80`). No timeout when the seat never joins (`useRehearseAutoStart.ts:27`). "Rehearse" = real student seat on desktop, bots-only on phone/class page (`TeacherDashboard.tsx:340`, `ClassroomManager.tsx:219`). Seat is signed out, so no differentiated levels (`playerJoinHandler.ts:171`). Hide unmounts the iframe and drops the seat. Storage/cookie/BroadcastChannel monkey-patch is brittle (`practiceSeatStorage.ts:25-51`).
- **Naming drift.** list / lesson / assignment / pack / session / homework; six labels for "start a game"; "Library" routed at `/curriculum`.
- **Two onboarding checklists** with different wording (`TeacherDashboard.tsx:95-104,179-195`).
- **Class creation silently assigns a starter pack** counted against the free cap (`ClassSetupCreate.tsx:80`).
- **Lobby overload**: 8 mode tiles + ~15 options (`LobbyGameOptions.tsx`); ready screen has ~12 actions (`ClassSetupInviteView.tsx:95-165`).
- **Pro asks spread over Home** (sidebar, badge, banner, rail card, cap label, locked chips, locked tab).
- **Shared device**: next student joins as the previous (anonymous session counts as signed in, name step skipped, stored name reused: `signedInJoin.ts:39`, `useJoinFlow.ts:158,166`).
- **No name moderation** on classroom join (`joinGuards.ts:8-16`); names go to the projector wall. `isProfane` exists in `backend/utils/profanityFilter.ts`.
- **Consumer widgets on edu surfaces**: SignupPromptHost, AgeGatePromptWrapper, UnlockNotifierMount, GlobalCoinEarnFx, CoinProvider, MusicProvider, etc. (`app/conditional-providers.tsx`). A sign-up modal can plausibly fire on `/student/quick-play` [U].
- **Root layout is consumer-branded**: JSON-LD, OG, `geo.region=IL`, Play Store tags, one PWA manifest (`app/manifest.js:2-5,81`, start_url `/en`).
- **Edu comparison/landing pages carry consumer chrome and ads**; edu landing CTAs link to `/daily/word-hunt` and `/multiplayer`.
- **Tables without scroll**: `TeacherProCompareCheckoutStrip.tsx`, `ProFramingSectionTable.tsx`.

## P2 / P3 (short)

Invite link uses UI language not class language (`ClassSetupInvite.tsx:181-182`); no language switcher on join; Cyrillic keyboard strips code input; email-recovery control shown to every guest; unauthenticated email rewrite endpoint (`recover-email/route.ts`); teachers can join as students; student sees only latest class (`classrooms.ts:188-191`); four overlapping edu section lists (`authReturnPath.ts:8`, `conditional-providers.tsx:62`, `admob-routes.ts:23`, `proxy.ts:92`); chrome hidden not unmounted; `user_role` defaults to student for everyone; "Try it as a student" 3x on desktop Home; no e2e for practice; teacher class page is a delete screen; missing teacher tools (merge student, rotate code, archive, free CSV, reset guest device); sub-44px targets (`DiscoverPanel.tsx:94`, `lists/_components/ui.tsx:101`, `ReteachActions.tsx:178`); physical left/right in `EducationHeaderMobileMenu.tsx:63`, `VocabQuizFooterBar.tsx:107`.

## UI debt (neo-brutalist)

Mostly on-token already (zero `gray-*`/`slate-*`/`shadow-md`). Debt is five parallel dialects: `ui/button` (unused, 6 imports), `NB_*` (`teacher/nb/nbStyles.ts`, 40 importers), `PRIMARY_BUTTON` (`live/eduLiveStyles.ts`), `JoinPrimaryButton`, `ControlButton`; 487 raw `<button` lines; 941 hand-rolled `rounded-neo border-N shadow` lines vs 9 `NeoPanel`; ~8 sibling banners; 5 empty states; 3 stat tiles; ~20 hand-rolled `fixed inset-0` modals. Off-token: `bg-white`/`border-black` in `ClassCard.tsx:72`, `InviteStudentsCta.tsx:96,135`, `ClassroomStudentList.tsx:48,63`; `rounded-md/lg` in student academy cards (`TodayCard.tsx:38,68,74`, `AssignmentDueCard.tsx:95,104`).
Caution: `NB_PANEL` hardcodes `bg-[#2a2b4a]`; do NOT swap to `--neo-navy-elevated` blindly, it flips to cream in the light theme (`globals.css:3722`) while panel text stays cream.

## Target design

**Teacher Home = 3 primary actions**: Start a game (selected class; "Play again" after first), Share code (code + QR + WhatsApp in one sheet), See results (single entry; free summary, Pro detail). Nav: Home / Classes / Library. One vocabulary: "class", "word list", "Start game". One onboarding checklist. "Try it" once, as a text link. Lobby: list + mode, one Options sheet, Pro options grouped. One Pro slot in sidebar plus the Results gate. Class creation says "We'll add a starter word list".

**Practice = "Try it" (hybrid)**: default solo sandbox on the singleplayer engine (no room, no seat, works on phone, no roster/analytics leakage); advanced "test the live room on your own phone" via QR + normal guest join with the server practice flag. Delete the iframe panel and storage patch. Open decision: how a sandbox shows differentiated levels.

**Student**: 1 tap from link/QR (keep); confirm "Continue as Dana?" instead of silently reusing a session; server-side profanity fallback; auto-join on 6th character; class-language invite URLs + language chip; replay/analytics off student routes.

**Separation (phased, URLs unchanged)**
- A (≤1 day): gate pixels + consumer widgets off edu paths; `surface=edu|game` PostHog super-property; collapse the four section lists into `eduSections` with a guard test.
- B (3-5 days): route groups `(game)`/`(edu)` with separate root layouts: own metadata, JSON-LD, manifest, providers, consent-deny-by-default for students; move edu comparison + top-level landings into `(edu)`.
- C (2-3 days): move product routes off `/education/live` to a `/live`-style path with 308s; robots Disallow for `/teacher /student /report /join`; edu PWA manifest scoped to `/classroom`.
- D (owner infra call): `class.` subdomain for the app, marketing stays on `www`. Cleanest COPPA story, costs a split SEO footprint.

## Research (sources in the competitor report)

Kahoot "Launch demo" gives a real PIN and lets you join your own lobby as a test player; Nearpod Student Mode flips views in place; Gimkit class needs only name + color; Classroom "invite later"; Kahoot/Quizlet/Nearpod/Blooket use a separate student join origin. NN/g: first screen signals importance, defer advanced features. FTC COPPA FAQ: school consent covers educational use only (no ads, no commercial reuse). "One primary action on Home" is inference, not a documented standard.

## Order of work

1. Phase A separation + P0 analytics gates (guard tests).
2. Measure and fix the mobile top inset (inject `--combined-safe-area-top: 47px`, compare topbar offsets on teacher and student screens at 390px).
3. UI: `bg-white`/off-token radius fixes, table wrappers, then a single `NeoButton`/`NeoPanel` tone migration on Home, class page, lobby, results (guard test banning new raw patterns).
4. Teacher Home 3-action layout + naming + single checklist + single Results entry.
5. Practice "Try it" sandbox.
6. Student join hardening.
