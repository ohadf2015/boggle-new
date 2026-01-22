# Codebase Concerns

**Analysis Date:** 2025-01-22

## Tech Debt

**Incomplete Adventure Mode Themes (Worlds 4-10):**
- Issue: Worlds 4-10 use placeholder themes copied from World 1 with only color/text changes. No custom mechanics, animations, or visual configurations.
- Files: `lib/adventure/themes/index.ts`
- Impact: Worlds 4-10 lack distinctive identity and gameplay variation. Visual consistency breaks immersion despite different mechanics (idioms, compounds, anagrams, palindromes, rare words, multilingual, all mechanics).
- Fix approach: Implement full theme configurations for each world with custom tile styles, animations, backgrounds, and particle effects matching their mechanic theme.

**TypeScript Type Safety Disabled:**
- Issue: `noUncheckedIndexedAccess: false` in `tsconfig.json` is disabled with TODO comment stating "after fixing remaining array access patterns".
- Files: `tsconfig.json` (line 32)
- Impact: Array access patterns throughout codebase are not type-checked. Silent failures possible when accessing undefined array indices.
- Fix approach: Enable `noUncheckedIndexedAccess: true` and systematically fix all array access patterns to use optional chaining or bounds checking.

**Hardcoded Email Language Fallback:**
- Issue: Email daily challenge play links default to `/en/daily` regardless of user's preferred language.
- Files: `lib/email.ts` (line 566)
- Impact: Non-English users receive emails with English links. Violates i18n principles.
- Fix approach: Use `recipient.language` or language preference from database to generate localized play URLs.

**Word Validation Missing Minimum Length Check:**
- Issue: Minimum word length validation (3 characters) not implemented in validation pipeline. Short words proceed to AI validation layer.
- Files: `backend/__tests__/gameAIService.test.js` (lines 203-213), actual implementation likely in `backend/dictionary.ts`
- Impact: Invalid short words (1-2 characters) waste AI API tokens on validation that could be rejected at input validation layer.
- Fix approach: Add synchronous length validation (>=3 chars) before any AI or database queries.

---

## Known Bugs

**Empty roomName in Session Storage (Multiplayer Join):**
- Symptoms: When joining a multiplayer room, the session's `roomName` is saved as empty string instead of using server-provided room name. On socket reconnection, this causes backend validation failures.
- Files: `app/[locale]/multiplayer/__tests__/roomNameSessionBug.test.ts` (lines 30-72)
- Trigger: Join game → server broadcasts with `data.roomName` → React state async update → session saved with empty local state
- Workaround: None currently. Code may fail silently on reconnect.
- Status: Known issue with test documenting the bug, but root cause not fixed in multiplayer page logic.

**Timer Stuck After Server Sync (Multiplayer Game):**
- Symptoms: Game timer freezes and stops counting down after server broadcasts a time update. Players see stuck timer instead of live countdown.
- Files: `hooks/__tests__/useGameTimer.sync.test.ts` (lines 45-56, 175-181), actual hook implementation in `hooks/useGameTimer.ts`
- Trigger: Timer running → server sync event with `setTime()` → `startTimestampRef` becomes null → animation loop breaks
- Workaround: None. Requires hook fix to restart animation loop on sync.
- Status: Comprehensive test reproducing issue exists. Root cause identified but not fixed.

**Win Streak Not Synced to Profile Stats:**
- Symptoms: Number of wins is not synchronized to the player's profile stats after completing a daily/singleplayer game. Win count stays at 0 even after wins.
- Files: `hooks/__tests__/useProfileRefreshOnResults.test.tsx` (lines 7-34)
- Trigger: Complete single player game → win counted locally → profile stats not refreshed → win count unchanged in profile
- Workaround: Manual profile refresh may update count.
- Status: Test documents missing refresh call. The `useProfileRefreshOnResults` hook likely not being called in appropriate lifecycle.

**Gift Modal Auto-Shows Again After Navigation:**
- Symptoms: Gift modal persists across navigation. After closing gift modal and navigating away, the modal reappears when returning to the page.
- Files: `.claude/agents/reviews/rca-gift-modal-persistence-navigation.md` (line 40)
- Trigger: Show gift modal → close modal → navigate away → navigate back → modal shows again
- Workaround: Close browser tab and reload.
- Status: Known issue documented in RCA. Root cause: Modal state not properly cleared on unmount or navigation.

**Unclaimed Gifts Refresh Bug (Eventual Consistency Issue):**
- Symptoms: When claiming a gift, if the API hasn't processed the claim yet, a refresh can overwrite the local claimed state with API data that still shows gift as unclaimed.
- Files: `hooks/__tests__/useUnclaimedGifts.refreshOverwrite.test.tsx` (lines 81-169)
- Trigger: Claim gift → API processing delayed → before API responds, component refreshes → local state overwritten with old API data
- Workaround: Wait for API response before initiating refresh.
- Status: Test reproduces issue. Root cause: Naive refresh overwrites optimistic state without checking timestamps or pending operations.

**Japanese 2-Letter Words Incorrectly Rejected:**
- Symptoms: Valid Japanese words with 2 letters are rejected as too short. Daily Buzz hardcodes `< 3` character check that doesn't account for languages where 2-letter words are valid (Japanese, Chinese).
- Files: `.claude/agents/reviews/rca-japanese-2-letter-words-rejected.md` (line 161)
- Trigger: Japanese player submits 2-letter word in Daily Buzz → hardcoded `< 3` check rejects it
- Workaround: None. 2-letter Japanese words cannot be submitted.
- Status: Documented in RCA. Fix requires language-aware minimum length validation.

**Word Hunt Yellow Letter Persistence on Green (Clue Box Bug):**
- Symptoms: Yellow letter (letter in word, wrong position) persists in `knownLetters` after user finds the letter at its correct position (green). Yellow indicator should be removed once letter position is confirmed.
- Files: `components/daily/survival/__tests__/SurvivalClueBoxes.yellowRemoval.test.tsx`, `components/daily/survival/__tests__/LandscapeClueBoxes.yellowPersistence.test.tsx`
- Trigger: Guess "PXXXX" → P is yellow at position 0 → Guess "XPXXX" → P is green at position 1 → P still shows as yellow (bug: should be removed)
- Workaround: None. Affects player's understanding of found letters.
- Status: Test covers multiple scenarios. Root cause: Yellow letter not removed when green found at new position.

**Avatar Display Priority Bug (Profile Picture vs Character Avatar):**
- Symptoms: Avatar selection logic incorrect. When both profile picture and character avatar exist, character avatar should take priority, but currently profile picture is shown instead.
- Files: `__tests__/Avatar.uploaded-image-bug.test.tsx` (lines 19-65)
- Trigger: Set both profilePicture (PROFILE_AVATAR_ID) and character avatar → render avatar → shows profile picture (wrong)
- Workaround: Manually clear profile picture to show character avatar.
- Status: Test documents expected behavior. Root cause: Logic order in avatar selection component.

**Hamburger Menu Shows Avatar Instead of Menu Icon:**
- Symptoms: On mobile, hamburger menu sometimes shows user avatar instead of menu icon. Should ALWAYS show menu icon for authenticated players.
- Files: `__tests__/Header.hamburger-avatar-bug.test.tsx` (lines 105-140)
- Trigger: Authenticated player on mobile landscape → hamburger menu renders → shows avatar instead of menu icon
- Workaround: None.
- Status: Test documents expected behavior. Root cause: Conditional logic error in Header component.

---

## Security Considerations

**No Rate Limiting on Community Word Endpoints:**
- Risk: Attackers can spam malicious word submissions without rate limiting, potentially flooding the community words table.
- Files: `backend/routes/` (admin.ts has rate limiting but community endpoints lack it), `backend/modules/communityWordManager.ts`
- Current mitigation: None. Only admin endpoints have rate limiting.
- Recommendations: Add rate limiting (e.g., 5 submissions per user per hour) to all community word endpoints. Implement per-user or per-IP throttling.

**Admin Endpoint Protection:**
- Risk: Admin endpoints (`/api/admin/*`) rely solely on JWT authentication. No secondary verification (e.g., email verification, 2FA).
- Files: `backend/routes/admin.ts` (lines 1-150)
- Current mitigation: JWT token validation. Rate limiting exists but is simple in-memory.
- Recommendations: Add secondary admin verification (email confirmation, time-based token expiration, audit logging for all admin actions).

**Email Unsubscribe Token Generation:**
- Risk: `crypto.randomBytes(32).toString('hex')` is secure, but tokens may be reused or not properly validated server-side.
- Files: `lib/email.ts` (line 54)
- Current mitigation: Token generated with 32 bytes entropy (256-bit).
- Recommendations: Ensure tokens have expiration times, are single-use only, and validated against database on unsubscribe endpoint.

**Input Validation Gaps:**
- Risk: Frontend validates input (min length, format) but some endpoints lack server-side validation.
- Files: Multiple endpoints in `backend/routes/`
- Current mitigation: Partial server-side validation via Zod schemas (e.g., `blacklistAddSchema` in admin.ts).
- Recommendations: Enforce server-side validation on ALL user inputs, even if frontend validates first.

---

## Performance Bottlenecks

**Large Component Files Cause Rendering Overhead:**
- Problem: `ResultsPage.tsx` (1659 lines), `multiplayer/page.tsx` (1443 lines), `admin.ts` (2256 lines) are massive monoliths. Re-renders affect entire page.
- Files: `components/views/ResultsPage.tsx`, `app/[locale]/multiplayer/page.tsx`, `backend/routes/admin.ts`
- Cause: Multiple concerns (UI, state, side effects) bundled in single component. React.memo and dynamic imports used but heavy lifting still happens in main component.
- Improvement path: Split into smaller sub-components with isolated state. Use `useCallback` to prevent unnecessary re-renders. Consider moving business logic to custom hooks.

**Ref-Based Combo Tracking in Hooks:**
- Problem: Multiple hooks use refs (`comboRef`, `comboSettersRef`) to track combo state instead of context. This causes stale closures and requires manual ref updates.
- Files: `player/hooks/socket/usePlayerWordEvents.ts` (line 43), `player/hooks/socket/usePlayerGameEvents.ts` (line 36), `player/hooks/usePlayerSocketEvents.ts` (line 43)
- Cause: Attempted workaround for context update latency. Refs don't trigger re-renders but cause stale state.
- Improvement path: Migrate combo state to GameContext with action dispatchers. Accept slight latency from context updates (milliseconds, imperceptible to users).

**No Pagination on Admin Dashboard Queries:**
- Problem: Admin endpoints load all data into memory without pagination. Loading 10,000+ games or words at once causes memory spike and slow responses.
- Files: `backend/routes/admin.ts` (getAllGames, getDetailedGames, community words queries)
- Cause: Queries return entire result set without LIMIT/OFFSET.
- Improvement path: Implement pagination with cursor-based or offset-based queries. Add query limits (default 100 items, max 1000). Implement server-side filtering/sorting.

**Daily Puzzle Grid Generation Uses Linear Fallback:**
- Problem: When path finding fails, code falls back to linear search. This can take milliseconds per word, compounded across word list.
- Files: `utils/dailyChallenge/gridGeneration.ts` (lines 590, 676, 738, 1006, 1060, 1206)
- Cause: Complex path-finding algorithm (DiagonalPathfinder) fails silently, falls back to O(n) linear search.
- Improvement path: Cache path-finding results. Improve path-finding algorithm. Warn in logs if fallback happens frequently (indicates grid generation problem).

---

## Fragile Areas

**Adventure Mode Placeholder Themes:**
- Files: `lib/adventure/themes/index.ts` (worlds 4-10)
- Why fragile: Uses spread operator (`...WORLD_1_THEME`) to copy World 1 config, then overrides only color. Any change to World 1 structure affects all 7 placeholder themes. Missing `containerClass` CSS validation. No tests for placeholder theme generation.
- Safe modification: Create proper WorldTheme objects with explicit all properties. Add unit tests verifying each theme's shape. Use TypeScript to enforce completeness.
- Test coverage: No tests for placeholder theme creation. `createPlaceholderTheme()` untested.

**Timer Synchronization in Multiplayer Games:**
- Files: `hooks/useGameTimer.ts` (actual implementation), `hooks/__tests__/useGameTimer.sync.test.ts` (tests documenting bugs)
- Why fragile: Complex animation loop management. Multiple points of failure: `startTimestampRef`, `setTime()` method, effect dependencies. Ref logic interacts badly with pausing/syncing.
- Safe modification: Refactor to state machine approach. Separate concerns: tracking elapsed time vs. managing animation loop. Add comprehensive integration tests with real socket events.
- Test coverage: Tests exist but hook may not pass all. Animation loop restart logic needs verification.

**Session Management with Async State Updates:**
- Files: `app/[locale]/multiplayer/page.tsx`, `utils/session.ts`
- Why fragile: Session saved using local React state that may be stale. No guarantee state updated before socket event handler runs. Reconnection logic depends on saved session.
- Safe modification: Save server-provided data directly instead of local state. Validate session before use on reconnect.
- Test coverage: `roomNameSessionBug.test.ts` documents issue. Production code not fixed.

**Gift Modal State Across Navigation:**
- Files: `components/engagement/GiftModal.tsx` (presumed), pages using it
- Why fragile: Modal state not properly scoped. Persists across navigation without cleanup. Re-renders cause modal to reappear.
- Safe modification: Use Context with proper cleanup. Store state in URL query params or local storage with expiration. Unmount modal on navigation.
- Test coverage: Unknown. No tests found for modal persistence behavior.

**Daily Challenge Word Validation:**
- Files: `backend/dictionary.ts` (word validation), `backend/routes/dailyChallenge.ts`
- Why fragile: Multiple validation layers (length, dictionary, AI). No clear validation pipeline. Tests document missing minimum length check. Japanese 2-letter word rule hardcoded.
- Safe modification: Create validation pipeline with composable validators. Language-aware length validation. Centralized validation logic shared between all endpoints.
- Test coverage: Tests exist for some paths. Minimum length validation test exists but validator not implemented.

---

## Scaling Limits

**In-Memory Rate Limiting:**
- Current capacity: Limited by Node.js memory. Simple object-based rate limit tracking.
- Limit: With 10,000+ concurrent users, in-memory rate limits become unreliable (no persistence across server restarts, no distributed rate limiting).
- Scaling path: Move to Redis-based rate limiting. Share rate limit state across server instances. Implement sliding window or token bucket algorithms.

**Supabase Connection Pool Exhaustion:**
- Current capacity: Default connection pool (10-20 connections).
- Limit: High-concurrency games (100+ players) can exhaust pool. Queries queue and timeout.
- Scaling path: Increase pool size in Supabase. Implement connection pooling middleware (pgBouncer). Cache frequently queried data (word lists, user stats).

**WebSocket Broadcast Scalability:**
- Current capacity: Socket.IO handles ~1000 concurrent connections per server instance.
- Limit: Rooms with 200+ players experience latency spikes during game state broadcasts.
- Scaling path: Use Socket.IO adapter (Redis). Implement selective broadcasting (only relevant players receive updates). Batch updates to reduce message frequency.

**Daily Puzzle Grid Generation Performance:**
- Current capacity: Grid generation for 4x4 grid completes in ~100-200ms. Larger grids (5x5, 6x6) could timeout.
- Limit: If grid size increases or word list size grows significantly, generation times become unacceptable for user-facing endpoints.
- Scaling path: Pre-generate grids offline and cache. Implement progressive grid generation (show partial grid while completing). Optimize path-finding algorithm.

---

## Dependencies at Risk

**Old Glob Versions (v7):**
- Risk: `glob` v7 is deprecated. Package-lock shows multiple deprecated glob references.
- Impact: Security updates may not be backported. May cause issues with newer Node.js versions.
- Migration plan: Update to `glob` v9+. Requires testing build scripts and file globbing logic.

**Deprecated Utility Libraries:**
- Risk: `util-deprecate` (shown in package-lock) and other utilities marked deprecated.
- Impact: May be removed in future Node versions.
- Migration plan: Audit dependencies. Replace with active alternatives. Use `npm audit` regularly.

**ioredis Potential Memory Leaks:**
- Risk: Package-lock mentions "leaks memory" for deprecated module (not ioredis itself, but related).
- Impact: Long-running server processes could accumulate memory usage.
- Migration plan: Monitor memory usage. Update to latest ioredis. Implement connection pooling and proper cleanup.

---

## Missing Critical Features

**No Offline Mode:**
- Problem: Single-player games require server validation. Network interruption causes game crash or reset.
- Blocks: Offline play capability, progressive web app functionality.

**No Game Replay System:**
- Problem: Games are completed and results shown, but no way to review game board or replay guesses.
- Blocks: Learning feature, social sharing of interesting games.

**No Accessibility Tests:**
- Problem: Code follows some WCAG guidelines but no automated tests verify accessibility (keyboard nav, screen reader, color contrast).
- Blocks: Compliance verification, accessible gameplay.

**No Load Testing Framework:**
- Problem: No documented way to stress-test game servers. Performance under load unknown.
- Blocks: Scaling decisions, capacity planning.

---

## Test Coverage Gaps

**Multiplayer Join Flow:**
- What's not tested: Full join flow including session saving, reconnection logic, room name validation.
- Files: `app/[locale]/multiplayer/page.tsx`, `utils/session.ts`
- Risk: Session bugs (like roomName empty) remain undetected until production.
- Priority: High

**Timer Synchronization Edge Cases:**
- What's not tested: Rapid succession syncs, sync while pausing, sync with network latency simulation.
- Files: `hooks/useGameTimer.ts`
- Risk: Timer gets stuck in production despite existing tests.
- Priority: High

**Admin Endpoint Authorization:**
- What's not tested: Admin endpoints may not properly verify admin status on all routes.
- Files: `backend/routes/admin.ts`
- Risk: Non-admin users could access admin data or functionality.
- Priority: Critical

**Community Word Submission Abuse:**
- What's not tested: Rate limiting on community word endpoints, spam detection, word validation rigor.
- Files: `backend/modules/communityWordManager.ts`, `backend/routes/`
- Risk: Malicious word submissions, database pollution, service degradation.
- Priority: High

**Adventure Mode Themes (Worlds 4-10):**
- What's not tested: Placeholder theme shape validation, custom theme rendering, animation correctness.
- Files: `lib/adventure/themes/`
- Risk: Visual corruption, missing features for later worlds.
- Priority: Medium

**Email Service Failures:**
- What's not tested: Resend API failures, timeout handling, retry logic, email rendering across clients.
- Files: `lib/email.ts`
- Risk: Users don't receive daily challenge emails without knowing why.
- Priority: Medium

---

*Concerns audit: 2025-01-22*
