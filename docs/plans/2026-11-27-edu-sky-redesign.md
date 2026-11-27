# Classroom "Sky" redesign

Approved by the owner 2026-11-27 from generated mockups ("the clean design and how it looks look great", then "lets do it sky").
Review page: https://claude.ai/artifact/W2KUyph6MV1B99KK3QnaAx. Mockups (local): `~/.cache/lexiclash/edu-nb1127/{after,bg,rays,screens}/`.

## Look
- Page background: sky `#9ED8FF`, one token. Text on it is black.
- Surfaces: cream (`#FFF8EA`, never pure white) cards, thick black outline, solid black bottom lip (pressable), no blur, no gradients.
- Letter tiles and codes: chunky cream tiles, black outline, lip.
- One lime `#BFFF00` primary button per screen. Pink, cyan, yellow are small accents (header band, icon squares, class colour tab). Purple only on the active nav item and where a class or list is already purple. Black ink on every accent fill.
- Type: Fredoka headings, Rubik body (unchanged). Larger sizes, fewer boxes, clear hierarchy, nothing clipped.
- Rays: reward and winner moments only. Navy stage with cyan rays behind the chest; yellow rays behind the projector winner.
- Mascot stays. Player avatars stay.

## Keep (content and behaviour)
- Every control, state, string and data point of today's screens. Mockups dropped some (Share, Leave, waiting line on results): keep them.
- Teacher home: student table stays; no ready-made game cards in the first frame.
- All six languages, Hebrew RTL, reduced motion, 44px targets, projector no-scroll fits.
- The main (non-classroom) game does not change. Classroom rounds get a classroom-only skin on the shared board.

## Screens
Teacher: home, new class, class ready, classes, class page, library, pick a game, projector lobby, projector round, results, reports, upgrade (plus their dialogs, empty, loading and error states).
Student: join code, name, waiting room, warm-up, vocab quiz, live round, results, home, awards (plus practice modes, review, profile, lessons).
Public: `/education`, `/education/access` (teacher sign-up).
Out of scope: SEO article pages under `/education/*`, their titles and descriptions.

## Architecture

- Semantic Tailwind colours `edu-*` backed by CSS variables in `app/edu-sky.css`. **`:root` defaults equal today's dark values**; `html:has([data-edu-theme="sky"])` overrides them. A component shared with the main game or an SEO page therefore stays dark; only in-scope pages turn sky.
- `data-edu-theme="sky"` goes on each in-scope root element (server-rendered, never added in an effect). The scope also sets `html`/`body` background (no halftone image), `color-scheme: light`, and the shadcn vars (`--background --foreground --card --popover --muted --border --input`) so portals, dialogs and the toaster follow.
- Per-segment `viewport.themeColor` / `colorScheme` for the in-scope routes (new `student` and `join` layouts).
- Never swap `--neo-*` values and never add per-utility `!important` overrides.

| Token | Default (dark) | Sky |
|---|---|---|
| `edu-page` | neo-navy | `#9ED8FF` |
| `edu-surface` | neo-navy-light | `#FFF8EA` (cream: owner wants no pure white) |
| `edu-tile` | neo-cream | `#FFEFD2` |
| `edu-ink` (alpha capable) | neo-white | `#101114` |
| `edu-line` (alpha capable) | neo-cream | `#101114` |
| `edu-lime-ink` / `cyan-ink` / `yellow-ink` / `pink-ink` / `purple-ink` / `orange-ink` | the neo accent | `#3D5C00` / `#005F6B` / `#6B4A00` / `#B0105F` / `#5B21B6` / `#A8380A` |
| `shadow-edu-lip`, `-lip-sm` | today's hard shadow | `0 5px 0 #101114`, `0 3px 0 #101114` |

Shared CSS primitives (token based): `.edu-card`, `.edu-btn` + `-primary` (lime, black ink), `.edu-tile`, `.edu-rays-dark` (navy stage, cyan rays), `.edu-rays-gold` (yellow rays). Rays are static; no animation without reduced-motion fallback.

## Codemod (`fe-next/scripts/edu-sky-codemod.mjs`, committed, re-runnable, unit tested)

Works per string literal, keeps variant prefixes (`hover:`, `md:` …). Files: `components/{education,teacher,student}` and the in-scope app routes, `.tsx` + `.ts`, tests excluded from the first pass.

- `text-neo-white|neo-cream|white` (+ `/NN`) → `text-edu-ink[/NN]`, **unless** the same literal has a solid `bg-neo-purple`, `bg-neo-red`, `bg-neo-black`, `bg-black`, or the `edu-rays-dark` stage.
- `text-neo-gray-100|200` → `text-edu-ink/80`; `-300` → `/70`; `-400` → `/60`.
- `text-neo-{lime,cyan,yellow,pink,purple,orange}` → `text-edu-<accent>-ink`, same exception.
- `border|ring|divide|outline-neo-cream|neo-white|white` (incl. side variants): no alpha or alpha ≥ 25 → `-edu-line`; alpha < 25 → `-edu-line/NN`. `border-neo-gray-*` → `border-edu-line/30`.
- `bg-neo-cream|neo-white|white/NN` with NN ≤ 30 → `bg-edu-ink/NN` (solid ones stay).
- `bg-neo-navy` → `bg-edu-page` when the literal also has `min-h-*`, `h-dvh`, `h-screen` or `flex-1` page-root classes, else `bg-edu-surface`. `bg-neo-navy-light|elevated` → `bg-edu-surface`. `bg-neo-navy/NN` → kept for `fixed inset-0` dimmers, else `bg-edu-surface/NN`.
- Unchanged: `text-neo-black`, `text-neo-navy`, `border-neo-black`, solid `bg-neo-cream`, `bg-neo-black`.

## Routes

In (sky): `/teacher/**`, `/join/**`, `/student/**`, `/classroom/**`, `/education` (landing), `/education/{access,classroom-game,live,duels,help}/**`, parent report `/report/[token]`, dev previews.
Out (stay dark): SEO article, list and comparison pages under `/education/*`, `/education/for-schools`, `/education/classroom-addon/**`, miss-gap / passback share pages, `/pricing`, `/admin/**`, the main game.

Shared live board: classroom skin keyed on `isClassroomMode` / `readClassroomLiveFlags` (present on every classroom path including reconnect), never on `EduLiveSurfacesProvider`.

## Guards (red first)

- New `components/education/__tests__/eduSky.guard.test.ts`: ratchet — no `bg-neo-navy*`, `text-white`, `text-neo-cream`, `border-neo-cream` in the codemod file set outside an allowlist (rays stage); no white ink on lime/cyan/yellow/pink fills.
- Retarget (never delete) `educationBorderContrast`, `EducationHero.contrast`, `VocabQuizAnswerGrid.contrast` to the new backgrounds. Keep `inGameContainerClass` navy test; add a classroom-variant case.
- Lime / yellow / cyan on sky are ~1.2:1: every accent fill on the page carries a black outline. Cyan only inside white cards.
- Lips and 3px outlines must keep `edu-no-scroll`, `student-fit-390` and TV-zoom fits.
- Navy-painted art to review: join arena backdrop, academy map + `AcademyBackdrop`, lobby / podium / HQ backgrounds.

## Phases and ownership

1. Foundation (one builder): tokens, primitives, scope attribute, layouts, codemod + run, tests, guards.
2. Slice: teacher home, projector lobby, waiting room, results with rays. Real screenshots to owner (progress, keep going).
3. Fan-out, ≤3 builders, disjoint files:
   - T: `components/teacher/**`, `app/[locale]/teacher/**`
   - L: lobby, projector, live, host results, classroom board skin (`components/education/{lobby,projector,live,results,controls,boss,teamTiles,vocabQuiz}`)
   - S: student + public (`components/student/**`, `components/education/{join,practice,practicePicker,academyModes,achievements,duels,rewards}`, landing, access)
   Shared files (css, tailwind config, `neoStyles`, translations) have one owner: the coordinator. Builders run only their own related tests; no `tsc`.
4. Coordinator: one `tsc`, related suites, build, screenshots (phone, Hebrew, projector) vs mocks, fresh reviewer, owner approval, merge.

## Ship
Branch `feature/edu-sky-redesign`. Real before/after screenshots (phone, Hebrew, projector) to the owner; merge only after approval.
