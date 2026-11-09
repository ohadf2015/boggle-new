# Results showdown + brag restore (+ chunk audit) Plan

> Inline executing-plans. Specs already approved.

**Goal:** Hero word showdown + rematch H2H/Challenge on MP final results; restore MpBragCard on new chassis; audit chunk recovery and only fix a proven gap.

**Architecture:** Pure `shouldShowWordShowdown` + compact `WordShowdownPanel` mounted on `MpResultsStage` after MpMyCard. Footer gets Challenge CTA opening existing `ChallengeInviteDialog` (friends) or share modal (else). Restore `bragCard.ts` + `MpBragCard` from pre-deletion; mount on final branch. Chunk: inspect recovery stack; add failing test only if gap found.

**Tech:** fe-next, Vitest, existing friends/share/brag OG.

## Constraints
- Real match data only; no invented names/words/stats.
- Challenge = explicit user click + existing confirmation; no auto-invites/messages.
- Guests: showdown+rematch; Challenge → share/signup, never block rematch.
- Classroom calm/hidden unchanged; Hebrew RTL inherit.
- No conflicts with streak #1788 / ranked #1789 (additive mounts only).
- No merge/deploy/prod identities; mock social tests.

### Tasks
1. `lib/results/shouldShowWordShowdown.ts` + panel + stage mount + analytics
2. Footer Challenge + H2H strip (useRivalHeadToHead when data)
3. Restore bragCard + MpBragCard; mount; impression when visible
4. Chunk audit with tests; fix only proven gap else document no change
5. i18n, targeted tests, PR
