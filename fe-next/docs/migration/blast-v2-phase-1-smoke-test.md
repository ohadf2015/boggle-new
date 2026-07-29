# Blast v2 Phase 1 Smoke Test Procedure

**Phase 1:** Internal testing, 1 day, ~5-10 testers  
**Flag Setting:** `blast.v2 = true` for `role IN ('admin', 'tester')`  
**Outcome:** PASS/FAIL gate to Phase 2

---

## Pre-Test Setup

1. **Get tester credentials:**
   - Tester account created in PostgreSQL with `role = 'tester'`
   - Optional: Admin account for comparison testing (switch back to legacy)

2. **Enable flag in PostHog:**
   - Go to PostHog UI → Feature Flags → `blast.v2`
   - Set `blast.v2 = true` AND target:
     ```
     role = 'tester' OR role = 'admin'
     ```
   - Save

3. **Install app/open web:**
   - Android: Download APK from Pipeline (internal track)
   - iOS: TestFlight link (if available)
   - Web: Navigate to live.lexiclash.app (if deployed)

4. **Clear cache:**
   - Uninstall app (or clear app data)
   - Reinstall to ensure flag + translations fresh

---

## Test Checklist (45 min total)

### Test 1: Basic Gameplay (10 min)

**Environment:** Web or Android, locale = `en`

- [ ] Open Blast → v2 board loads (not legacy)
  - Expected: Board grid renders with Blast v2 styling (hard shadows, neo-thick borders)
  - Not expected: Old wavy Blast v1 animations

- [ ] Intro card dismisses, game ready
  - Expected: "Dismiss" button works, board interactive immediately
  - Not expected: Stuck on intro

- [ ] Drag-select valid word → word found
  - Expected: Sound effect plays, "CAT found!" toast, coins += 10-50, board updates (tiles fall)
  - Not expected: Silent failure, no feedback

- [ ] Level 1 completion → level complete card
  - Expected: Blue "Level 1 Complete" card with coin total
  - Not expected: Stuck at board or blank screen

- [ ] Tap next → Level 2 loads
  - Expected: Level 2 board renders, no crashes
  - Not expected: Errors in console (check devtools)

**Result:** [ ] PASS [ ] FAIL  
**Notes:** ___________________________

---

### Test 2: Event Firing via PostHog Console (10 min)

**Environment:** Web, devtools open, locale = `en`

1. Open PostHog console:
   - PostHog → Project → Logs (or Network tab)
   - Filter: events from session

2. Play through Level 1:

   - [ ] `blast_level_started` fires on intro dismiss
     - Payload: `{ level: 1, locale: "en", theme: "onboarding", mechanics: [...] }`
     - Expected: 1 event, correct shape

   - [ ] `blast_word_found` fires on each word (≥ 3-4 words)
     - Payload: `{ level: 1, word: "CAT", axis: "H", length: 3, isCascade: false, isBonus: false }`
     - Expected: ≥ 3 events, all have correct word name + axis + length

   - [ ] `blast_level_completed` fires on finish
     - Payload: `{ level: 1, locale: "en", theme: "onboarding", time_seconds: 30-180, hints_used: 0, cascades: 0, stars: 1|2|3, coins_earned: 100, gems_collected: 0 }`
     - Expected: 1 event, stars ≥ 1

3. Verify no errors:
   - [ ] No 400/500 response errors
   - [ ] No "postthog undefined" or "capture failed" errors in console

**Result:** [ ] PASS [ ] FAIL  
**Notes:** ___________________________

---

### Test 3: Locales (RTL, CJK, Diacritics) (15 min)

**Environment:** Android or web, switch locale

- [ ] **Hebrew (he):**
  - [ ] Board tiles render RTL (columns reversed visually)
  - [ ] Intro card text right-aligned
  - [ ] No mojibake or missing characters
  - [ ] Shadows flip correctly (right-side instead of left)

- [ ] **Japanese (ja):**
  - [ ] Hiragana/kanji render (not boxes)
  - [ ] Font fallback works (no missing glyphs)
  - [ ] Intro card legible

- [ ] **Swedish (sv):**
  - [ ] Diacritics (å, ä, ö) render
  - [ ] No mojibake

- [ ] **Spanish (es):**
  - [ ] Diacritics (á, é, í, ó, ú, ñ) render
  - [ ] No mojibake

**Result:** [ ] PASS [ ] FAIL  
**Notes:** ___________________________

---

### Test 4: Crash Logs (Sentry) (5 min)

**Environment:** Sentry dashboard

1. Open Sentry → Project: `lexiclash` (or your project slug)
2. Filter: Last 1 hour, is_cg = false (or your session marker)
3. Check for new error clusters:
   - [ ] No new Blast-related errors
   - [ ] If errors exist, classify them:
     - [ ] Pre-existing (ignore)
     - [ ] New to v2 (needs investigation)

4. Drill into any new error:
   - [ ] Check stack trace (points to v2 code in `components/blast/v2` or `lib/blast/v2`?)
   - [ ] Reproduce manually (if possible)
   - [ ] Note reproducibility (100%, 50%, flaky)

**Result:** [ ] PASS (0 new errors) [ ] FAIL (new error found)  
**Error Details (if FAIL):** ___________________________

---

## Gate Decision

**All tests PASS?**

- **YES** → Gate to Phase 2 ✅
  - Notify team: "Phase 1 smoke test passed"
  - Proceed to 25% rollout (Tuesday)

- **NO** → Investigate blocker 🔴
  - Assign owner to root-cause
  - Is it a code bug (fix + retest Phase 1)?
  - Or a bad test environment (retry)?
  - Target: Fix + re-test within 12h

---

## Common Issues & Diagnostics

### Issue: Board doesn't render / stuck on intro

**Check:**
1. Feature flag enabled? (PostHog → Feature Flags → `blast.v2 = true`)
2. User role = 'tester'? (Check user profile in DB)
3. App cache stale? (Clear app data, reinstall)
4. Network error? (Check Network tab in devtools for 404/500)

**Fix:** Retry after flag/role/cache fix

---

### Issue: Words don't register / silent failure

**Check:**
1. Tile selection correct? (Drag horizontally or vertically, not diagonal)
2. Word in dictionary? (Open PostHog console, check `word` field in event payload)
3. Already found? (Check if rejection reason = `duplicate`)

**Fix:** Try different word, confirm in payload

---

### Issue: `blast_level_completed` not firing

**Check:**
1. Did all words complete? (Check board — all words should be gone)
2. Event logged in PostHog console? (Search for `level_completed`)
3. Browser error? (Check console for JS errors)

**Fix:** Restart app, re-play, check event firing

---

### Issue: Sentry shows new crash

**Steps:**
1. **Reproduce:** Click "Replay" in Sentry to see event sequence
2. **Diagnose:**
   - Is it in `BlastGame.tsx`? → State management issue
   - Is it in `useBlastV2`? → Reducer issue
   - Is it in `BlastBoard`? → Rendering issue
3. **Assign:** File bug, assign to relevant owner
4. **Block Phase 2?** If crash is >1% of traffic: YES. Else: document as known issue, proceed with warning.

---

## Tester Sign-Off

**Tester Name:** ___________  
**Device:** Android [ ] iOS [ ] Web [ ]  
**Date:** ___________

**Results Summary:**
- [ ] All tests PASS → Ready for Phase 2
- [ ] Some tests FAIL → Blockers documented (see notes below)

**Critical Issues Found:**
```
(List any FAIL items with reproduction steps)
```

**Minor Issues / Notes:**
```
(List QoL improvements, i18n tweaks, etc. for later)
```

**Sign-off:** Tester ___________

---

## Phase 1 Ops Sign-Off

**Tested by:** _________, _________, _________  
(List all testers)

**All testers PASS?** [ ] Yes [ ] No

**Gate Decision:** [ ] Proceed to Phase 2 [ ] Hold for fixes

**Owner:** Ops Lead ___________  
**Date:** ___________
