# Google Families Policy — Social Features Compliance

**Status:** spec → implementation
**Date:** 2026-06-03
**Trigger:** Play Console rejection — "Social Apps & Features" requirement of Families Policy.

## The notice (verbatim asks)

1. App lacks an in-app reminder to be safe online / aware of real-world risk **before** child users exchange freeform media or info.
2. App lacks a method for **adults to manage social features** for child users (enable/disable, levels of functionality).

Required fixes per Google:

- Prevent children chatting with **unknown people**; allow only **known contacts**.
- Show a clear, prominent **online-safety reminder** before children exchange media/info.
- Require **adult action** before children share **personal information**.

## Policy facts (verified against support.google.com/.../9893335)

- **"Adult action"** = "a mechanism to verify that the user is **not a child** and does not encourage children to falsify their age… (an adult PIN, password, **birthdate**, **email verification**, photo ID, credit card, or SSN)." → **A neutral self-declared birth-year screen is an accepted mechanism.** No third-party VPC / parental dashboard needed.
- Policy bans apps "where the **main focus** is to chat with people they don't know" from targeting children. LexiClash's focus is **gameplay**, not chat → keep stranger *matchmaking gameplay*, cut stranger *freeform communication* for children.
- No single child-age threshold in the doc. We use **< 13** (COPPA), the conservative default.

## Design principle

**Proportionate.** App audience is 15–40 (CLAUDE.md). We do **not** build a supervised-social product for kids. We **limit** under-13 (and unknown-age) users out of stranger/freeform social, gate personal-info surfaces behind adult action, and give adults a control panel. The entire child-tier behaviour is one config object so the business can later flip to "supervised social" without rewiring.

## Current social surface (audit)

| Surface | Channel | Risk | Child action |
|---|---|---|---|
| In-game room chat | freeform text, strangers | HIGH | **OFF** |
| Matchmaking-room chat | freeform text, strangers | HIGH | **OFF** |
| Friend DM | freeform text, "friends" | MED (friend-add is open username search ≠ known contact) | **OFF** by default |
| Friend add/search | acquire contacts via open search | MED | **OFF** (this is the loophole if left open) |
| Friend-challenge message | 200-char freeform | MED | **OFF** |
| Custom display name | freeform, visible to strangers | MED (personal info) | **OFF** → auto-safe handle |
| Emoji reactions (6 fixed) | no freeform | LOW | allowed |
| Matchmaking gameplay | no communication | none | allowed |

Identity is server-verified: `socket.data.verifiedUserId` (Supabase JWT middleware, `server/socketSetup.ts`). `chatHandler` currently keys off in-memory `getUsernameBySocketId` but the verified id + a derived tier are available on the same socket.

## Architecture

### 1. Age signal → social tier (server-authoritative)

- **Authed users:** `profiles.birth_year` (new column). Authoritative.
- **Guests:** self-declared birth year in `localStorage`, sent via socket `handshake.auth.declaredBirthYear`. Policy permits self-declaration.
- `computeSocialTier(birthYear, now)` → `'adult' | 'child' | 'unknown'`.
  - `unknown` = no age on record yet. Treated **as restricted as child** for stranger/freeform surfaces (airtight for fresh reviewer accounts), but the age screen is prompted so adults self-clear.

### 2. Capability policy object (the hedge)

`lib/families/socialPolicy.ts` — pure, no IO:

```ts
export const CHILD_AGE_THRESHOLD = 13;

export interface SocialCapabilities {
  publicRoomChat: boolean;     // freeform chat with strangers in a game room
  friendMessaging: boolean;    // 1:1 DM
  friendManagement: boolean;   // send/accept requests, search users
  customDisplayName: boolean;  // freeform name visible to others
  emojiReactions: boolean;     // 6 fixed emoji — always allowed
}

export type SocialTier = 'adult' | 'child' | 'unknown';

export const ADULT_CAPABILITIES: SocialCapabilities;          // all true
export const CHILD_CAPABILITIES_DEFAULT: SocialCapabilities;  // all false except emojiReactions

export function computeSocialTier(birthYear: number | null | undefined, currentYear: number): SocialTier;
export function resolveSocialCapabilities(
  tier: SocialTier,
  adultOverride?: Partial<SocialCapabilities> | null,  // set by adult mgmt panel
): SocialCapabilities;
```

Resolution: adult → ADULT. child/unknown → CHILD_DEFAULT, then merged with `adultOverride` (only an adult-action-gated panel can write the override; child cannot self-raise). Emoji always on.

### 3. Server-side enforcement (never trust client)

- Socket middleware computes `socket.data.socialTier` + `socket.data.socialCaps` at connect (from profile or handshake claim).
- `chatHandler.chatMessage`: reject if `!socialCaps.publicRoomChat`.
- `friendMessagingHandler.sendMessage`: reject if `!socialCaps.friendMessaging`.
- `friendsHandler.sendRequest / searchUsers`: reject if `!socialCaps.friendManagement`.
- Display-name update path: reject freeform set if `!customDisplayName` (assign safe auto-handle instead).
- Rejection → `emitError(socket, ErrorCodes.SOCIAL_RESTRICTED)` (new code) so client shows the safety/age-gate prompt.

### 4. Neutral age screen (UI)

- `AgeGate` modal: no pre-selected value, asks **birth year** (dropdown) — neutral wording, no "must be 13+" hint, no encouragement to inflate.
- Shown once when a user with no age-on-record reaches a social surface (or proactively at first session). Submits → authed: `POST /api/account/age`; guest: localStorage + reconnect socket with claim.
- Until answered, social surfaces render the gate instead of the input.

### 5. Safety reminder (UI)

- `SafetyReminder` modal: "Be safe online. Don't share personal info (real name, address, school, phone). People online may not be who they say." Shown **before first freeform exchange** (first chat open / first DM) for any non-adult, ack stored (localStorage + `profiles.safety_ack_at` for authed). Adults: shown once too (cheap, good practice) but never blocks.

### 6. Adult management panel

- Route `app/[locale]/account/parental-controls/page.tsx`.
- **Adult-action gate** to enter: re-declare birth year (must resolve to adult) OR re-enter account password. (Both are policy-accepted adult actions.)
- Inside: toggle each social capability for the account, or a coarse level (`off` / `friends-only` / `full`). Writes `profiles.social_features_override` (authed) → re-resolves caps. For guest/child device, stored locally + gates UI.

## Data model (migration `20260603120000_families_social_age_gate.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year SMALLINT,
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safety_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS social_features_override JSONB;
```

`birth_year` (not full DOB) — minimise PII collected from children. No realtime publication change (no consumer) per `.claude/rules/50-supabase-perf.md`.

## Out of scope (flag in PR — explicit, not silent)

- **Play Console "Target Audience & Content" declaration must be made consistent** with this in-app behaviour. If the business does NOT want under-13 users, also correct the declaration. In-app fix + declaration must agree or review bounces again. **Not a code change — owner must do this in Play Console.**
- **Child Safety Standards policy** (separate from this Families "Social Apps & Features" fix): the Social category also requires a *published* CSAE standards page + an in-app child-safety point of contact. Cannot be satisfied in code here — track separately.
- **`customDisplayName` enforcement (write path).** The capability exists in the policy object and is resolved/managed, but no server check yet blocks a child from setting a freeform display name (onboarding `ProfileCustomizationModal` + the profile write path). Display name is a lower-risk personal-info surface than chat/DM (the channels Google flagged). **Follow-up:** gate the display-name write (assign a safe auto-handle for children) — see `socialPolicy.ts` note on `customDisplayName`.
- **Safety reminder on the friend-DM path.** Currently the reminder fires in `RoomChat` only. DMs are OFF by default for children (only an adult can enable `friendMessaging` via parental controls), and the ack is a single global flag (localStorage `lc_safety_ack` + `profiles.safety_ack_at`), so a child who used room chat is already acked. **Follow-up:** also trigger `SafetyReminderModal` from `MessageComposer`/the DM thread for full coverage when DM is the first freeform surface.
- Full third-party verifiable parental consent, parental remote dashboard, user-reporting/moderation queue.

## Test plan (TDD, all phases)

- Phase 1 pure core: tier boundaries (12→child, 13→adult, null→unknown, future/garbage year→unknown), capability resolution incl. override merge + emoji-always-on + child-cannot-self-raise.
- Phase 3 enforcement: handler rejects when cap false, allows when true, guest=unknown rejected, adult allowed.
- Frontend: gate renders age screen when unknown; safety reminder shows before exchange; panel requires adult-action.

## Rollout

JS/web only → Railway web deploy. Native app loads remote URL → no Android/iOS release required. Existing adults get a one-time age screen; gameplay never blocked.

**Deploy ordering:** the `profiles` columns (`birth_year`, `age_verified_at`, `safety_ack_at`, `social_features_override`) were **applied to the live DB** on 2026-06-03 (migration `families_social_age_gate`), so the widened `PROFILE_SELECTS` (`lib/supabase.ts`) is safe to ship. Verified columns exist + nullable.

## Verification status

- `lib/families/socialPolicy.ts` 16 · `socialPolicyServer` 11 · enforcement handlers 5 · `/api/account/age` 5 · `/api/account/social-settings` 5 · `RoomChat` 28+3 gating = **73 new tests green**.
- 10 collateral suites that render `RoomChat` indirectly: 58 green (gate causes no breakage).
- Full frontend `tsc`: zero new errors (the only failures are a pre-existing unrelated marketing page).
- 5-locale `familiesSafety` namespace: 27 keys each, parity OK, all parse.
- `npm run build`: green (after reverting one unrelated daemon-broken file `lexiclash-vs-wordle/page.tsx` to HEAD).

## Guest age re-resolution (subtle)

`utils/SocketContext.tsx` sets `auth` as a **function**, so socket.io re-evaluates it on every (re)connection — a guest who declares their age mid-session and reconnects is re-resolved server-side (an object snapshot would have stayed stale). The two manual `socket.auth = {token}` reconnect overrides were removed (they would clobber the function).
