# Education UI Audit — Teacher & Student (2026-06-11)

Scope: ~151 files across teacher dashboard, student hub, shared education (classroom,
duels, achievements, practice), admin edu management, edu marketing.
Method: 3 surface auditors → cross-verified every finding against the real design
tokens (false positives removed) → external perspective via council (Gemini).

Design-system rule that drives most contrast fixes: **electric accents (lime #BFFF00,
cyan #00FFFF, yellow #FFE135, pink #FF1493) pair with BLACK text only.** White text on
them ranges 1.2:1 (lime/cyan/yellow — invisible) to 3.6:1 (pink — fails AA body). The
house spec already says secondary button = pink + black, so white-on-accent is both a
contrast fail and a deviation.

False positives the auditors raised that were NOT bugs (verified, left alone):
- "black-on-lime fails 1.2:1" — backwards; black-on-lime is ~17:1 (it's *white* that fails).
- "platinum #E5E4E2 text on navy ≈ 2:1" — it's near-white, ~13:1, fine.
- `bg-neo-cyan/10 text-neo-white` etc — `/10` is a faint tint over navy; bg is ~navy, white fine.

---

## FIXED THIS SESSION

### Commit 1 — Contrast pass (pure className swaps, no behavior change)
White/light text on full-opacity accent → black, per house spec. 14 edits / 11 files:
- `components/education/ClassroomLeaderboard.tsx` — top50 tier badge + streak badge (text-xs, true AA fail)
- `components/education/duels/DuelLobby.tsx` ×3 (incl. text-[10px] PvP badge — true AA fail)
- `components/education/duels/{ChallengeButton,DuelGameView,RealTimeDuelGame}.tsx`
- `components/education/challenges/DailyChallengeCard.tsx` (hard tier — was odd-one-out vs easy/medium)
- `components/teacher/lesson-creation/TemplateLessonSelector.tsx`
- `app/[locale]/teacher/profile/PageClient.tsx` — student-count was `text-neo-cyan` on cream ≈ 1.1:1 (invisible)
- `app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx` — active-tab text
- `app/[locale]/student/profile/PageClient.tsx` — XP (orange) + streak (pink) badges
- `components/education/EducationModeMock.tsx` — pink medal → navy (match siblings)

### Commit 2 — Behavioral loose ends (TDD)
- **Dead "Export Report" button** (`AnalyticsDashboard.tsx`): `onClick` was `() => {/* export logic */}`
  — a fully-styled button that did nothing. Wired to a real client-side CSV download via new
  tested pure module `lib/education/studentProgressCsv.ts` (RFC-4180 escaping, UTF-8 BOM for
  Hebrew/Japanese in Excel). Disabled when 0 students. 5 unit + 2 component tests.
- **Broken table headers** (`AnalyticsDashboard.tsx`): Level/Streak columns reused the templated
  keys `"Level {{level}}"` / `"{{count}}-day streak"` with no params → `t()` renders the literal
  placeholders. Added clean `colLevel`/`colStreak` keys ×5 langs. Also `text-left`→`text-start` (RTL).
- **Keyboard-inaccessible rows** (`AnalyticsDashboard.tsx`): clickable `<tr>` now has
  role/tabIndex/Enter+Space/focus-ring/aria-label.
- **Join code input** (`JoinClassroomForm.tsx`): hardcoded `placeholder="ABC123"` → i18n key ×5;
  added `autoCapitalize="characters"`; paste-button touch target 40px → 44px.

Validation: 160 tests green across affected suites, lint 0, tsc 0 on changed files.

---

## REMAINING — PRIORITIZED BACKLOG (verified, not yet fixed)

### P1 — fix before release
| Finding | Location | Fix |
|---|---|---|
| Celebration modals not Escape-dismissable | `LevelUpCelebration`, `milestones/MilestoneCelebration`, `AchievementUnlockModal` | focus trap present; add `onKeyDown` Escape → onClose |
| No empty state when 0 achievements unlocked | `app/[locale]/student/achievements/PageClient.tsx` | encouraging empty card + mascot + CTA |
| Hardcoded strings (i18n violation) | `teacher/reports/PageClient.tsx` ("Loading classrooms…", "No classrooms found"); `teacher/classroom/[id]/analytics/PageClient.tsx` ("Recent Activity", "completed a lesson"/"gained XP"/"attempted a word"); `GameCodeDisplay.tsx` (copy-fail toasts); `QuickStartButton.tsx` ("Class:"); `reports/ClassProgressReport.tsx` ("Teacher:") | wrap in `t()` + add keys ×5 |

### P2 — fix next pass
| Finding | Location | Fix |
|---|---|---|
| RTL: opponent/player sides not swapped | `duels/OpponentProgressBar.tsx` | swap widths/sides when `isRTL` |
| RTL: no `dir` wrapper | `student/PlayWithClassButton.tsx`, `student/ClassroomGameBanner.tsx` | wrap with `dir` from `useLanguage()` |
| RTL: hardcoded `→` arrow | `milestones/MilestoneTracker.tsx`, `ClassroomModeBanner.tsx` | `{isRTL ? '←' : '→'}` |
| Raw UUID shown when name missing | `duels/DuelLobby.tsx` (pending challenges) | prefetch challenger `display_name` |
| Spinner-in-content vs skeleton (inconsistent) | `AnalyticsDashboard`, `StudentProgressTable`, `ClassroomStudentList`, `VocabularyHeatmap` | use `EducationSkeletons` like ClassroomManager/LessonBuilder do |
| Error state has no retry | `StudentProgressTable`, `VocabularyHeatmap`, `ClassroomStudentList`, `ActivityFeed` | add retry button (AnalyticsDashboard error state is the model) |
| Low-contrast fallback | `assignments/AssignmentTrackingPanel.tsx` unknown-type fallback `bg-neo-navy` + `text-neo-black` | give fallback a light text color |
| Washed-out completed card | `student/StudentLessonView.tsx` `bg-neo-lime/10` | bump to `/20` or solid border |

### P3 — polish
- `StudentLessonView.tsx` "NEW" / "✓ DONE" badges hardcoded → `t()`.
- `ClassroomLeaderboard.tsx` "moved up" uses `text-green-400` → `text-neo-lime` (design token).
- `StudentLessonView.tsx` error text `text-neo-pink` (≈4.67:1, marginal) → `text-neo-red` (wrong-token, the design system reserves pink for multiplayer not errors).

---

## Council (Gemini) higher-leverage ideas — features, not audit fixes (separate ticket)
- TV/party big join-code + phone Quick-Join that bypasses login on first session.
- "Intervention tiles" instead of passive charts ("5 students failed Rhetoric — add to tomorrow's list?").
- "Populate with demo data" toggle so teachers see analytics ROI before a class exists (empty-dashboard abandonment).
- "Why" feedback loop: show the correct word in a sentence before the next turn.
- Force Rubik-Bold (not Fredoka) for gameplay-critical text at TV distance.
