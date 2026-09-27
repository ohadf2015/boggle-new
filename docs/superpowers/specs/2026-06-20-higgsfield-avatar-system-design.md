# Higgsfield-Powered Avatar System — Design Spec

**Date:** 2026-06-20
**Goal:** Use Higgsfield AI to make the LexiClash avatar system "super and attractive."
**Status:** Design → implementation (Track A ships; Track B architected flag-dark).

---

## 1. Context — current avatar system

LexiClash already has a **dual** avatar system:

1. **Static mascot roster** — 17 kawaii food/nature PNGs (`broccoli-bob`, `pizza-pete`, …) in
   `public/avatars/`, registered in `fe-next/utils/avatarConfig.ts` (`id`/`name`/`filename`).
   Rendered as plain `<img>`; emoji+color fallback for leaderboards.
2. **Procedural custom avatars** — deep SVG part system (`shared/types/customAvatar.ts`,
   `components/avatar/*`): 19 face shapes, 46 hair, 35 eyes, 35 mouths, accessories, premium tiers,
   live **moods** (`lib/avatar/avatarMood.ts`), **tier sparkle effects**, game-mode **frames**.
   Stored as `profiles.avatar_config` JSONB. Rendered **live in-browser** (zero asset cost),
   reactively, everywhere — leaderboards (dozens at once), in-game, win screens.

### The hard constraint that shapes everything
The live SVG avatar is **reactive and ubiquitous**: moods swap features per game event, tier effects
animate, frames composite by game mode, and dozens render at once on leaderboards. A Higgsfield render
is a **baked raster** — it loses all reactivity and is heavier on dense rosters.

> **Therefore: Higgsfield output is ADDITIVE — premium hero portraits on profile / win-screen / share
> surfaces. It NEVER replaces the live SVG avatar in leaderboards or in-game.** Replacing the displayed
> avatar would break moods, tier effects, frames, and leaderboard performance.

### Second decisive fact
The Higgsfield skill wraps a **local CLI authed to the user's personal account**, not a server-side
credential. So:
- **Author/build-time generation** (curator runs the CLI) = ✅ shippable now.
- **Per-user runtime generation** (server shells the CLI) = needs a provisioned server API key +
  async job infra + moderation → **flag-dark, infra-gated**.

---

## 2. Two tracks

### Track A — Curated Roster Glow-Up (SHIP NOW)
Regenerate + expand the static mascot roster with a cohesive, premium, neo-brutalist-kawaii style
using **Higgsfield Nano Banana 2** (character/stylized/reference-driven). Curator-vetted, generated at
author time, dropped into `public/avatars/`, wired via `avatarConfig.ts`.

- **Risk profile:** bounded one-time spend (curator-controlled), **zero runtime cost**, **no moderation
  surface** (no user-generated content). Cleanly shippable.
- **Why it's the "super and attractive" win:** instantly upgrades every avatar surface across the app
  with richer, on-brand art — no architecture change, no flags.
- **Reference-anchored consistency:** feed each existing mascot PNG as `--image` so the new render keeps
  the character's identity (broccoli stays broccoli) while leveling up the craft. Locked style prompt
  guarantees the set looks like one family.

**Deliverables:**
1. `scripts/avatar/generate-roster.mjs` — a repeatable generation pipeline: locked brand-style prompt
   + per-mascot identity descriptor, drives `higgsfield generate create nano_banana_2 --image <old> --wait`,
   downloads result to a **staging dir** (`daily-content/avatar-roster-v2/`), never overwrites
   `public/avatars/` directly (curator promotes after visual review).
2. A **proof-of-concept batch** (a handful of mascots) generated now, so the user can see the visual leap
   and judge before the full pack runs.
3. `scripts/avatar/promote-roster.mjs` — copies approved staging PNGs into `public/avatars/` (optionally
   `-v2`-suffixed for A/B), and an optional roster expansion (new mascot ids appended to `avatarConfig.ts`).

**Spend gate:** the POC batch (≈5–8 generations) is "prove once" and within the goal's implicit
authorization. The **full roster pack + any expansion is a spend decision** surfaced to the user before
running.

### Track B — "Avatar Glow-Up" per-user AI portrait (ARCHITECT FLAG-DARK)
The flagship wow feature: a user builds their SVG avatar, taps **"✨ Glow Up"**, and gets a stunning
illustrated/3D **hero portrait** of *their* avatar — shown on profile hero, win screens, and share cards.

**Flow (all dark until flag on + server key provisioned):**
1. Client rasterizes the live SVG avatar to PNG (canvas) — this is the identity anchor.
2. Upload → server route submits Higgsfield **Nano Banana 2** with `--image <raster>` (reference) +
   locked brand prompt (+ optional Soul-ID for identity lock).
3. Async job: submit → poll → on success download → store in a Supabase Storage bucket
   (`avatar-renders`).
4. Persist `profiles.avatar_render_url` + `avatar_render_status` + `avatar_render_seed_hash`
   (hash of the `avatar_config` it was rendered from → invalidate when the user re-customizes).
5. **Additive display only:** ProfileHero / win-screen / share-card read `avatar_render_url`; everything
   else keeps the live SVG.

**Gating & guardrails (why it stays dark):**
- Feature flag `avatar-glow-up` (default **off**).
- **Server credential required** — production needs a Higgsfield API key, not the local CLI.
- **Recurring per-user cost** → premium/coin price + per-user rate limit + cooldown.
- **Moderation surface** — user-anchored faces, audience 15–40, kawaii brand → a safety pass is required
  before any public display. (Track A has none of this; Track B owns it.)

**This spec implements Track B's *inert scaffolding* only** (migration columns behind nothing, a typed
service module with a clearly stubbed provider boundary, the rasterizer util, and the additive display
hook reading a column that's simply null today). No live generation, no enabled UI, no server key.

---

## 3. Brand style lock (shared prompt DNA)

All Higgsfield avatar generation uses one locked style descriptor so every asset reads as one family:

> *"Kawaii character mascot portrait, bold clean vector-illustration style, thick confident outlines,
> flat punchy cel shading, neo-brutalist party-game aesthetic, vibrant electric palette (lime #BFFF00,
> hot pink #FF1493, cyan #00FFFF, purple #8B5CF6) on deep navy, hard-edged not soft, expressive friendly
> face, centered bust framing, transparent or solid flat background, high contrast, sticker-ready."*

Per-asset identity descriptor is appended (e.g. *"a happy broccoli character"*), and the original PNG is
passed as `--image` to anchor identity. Output: square (1:1), high resolution, transparent/flat bg.

---

## 4. Components & boundaries

| Unit | Purpose | Depends on |
|---|---|---|
| `scripts/avatar/lib/brandStyle.mjs` | The locked style prompt + per-mascot descriptors (single source of truth) | — |
| `scripts/avatar/generate-roster.mjs` | Drive Higgsfield, download to staging | Higgsfield CLI, brandStyle |
| `scripts/avatar/promote-roster.mjs` | Staging → `public/avatars/` + config | avatarConfig.ts |
| `fe-next/lib/avatar/rasterizeAvatar.ts` (Track B) | SVG→PNG canvas raster of the live avatar | AvatarRenderer |
| `fe-next/lib/avatar/glowUpRender.ts` (Track B, stubbed provider) | submit/poll/store contract, provider boundary explicit | storage, provider key |
| `profiles.avatar_render_*` columns (Track B migration) | persist render url + status + seed hash | Supabase |
| ProfileHero display read (Track B) | additive: show render if present, else live SVG | column |

**Isolation test:** Track A is pure tooling + assets — no app-runtime coupling. Track B's display read is a
single additive branch (`render_url ?? <live SVG>`); the service module hides the provider behind one
function so swapping CLI↔server-API later is local.

---

## 5. Testing
- **Track A:** unit-test `brandStyle.mjs` (prompt assembly is deterministic, descriptors exist for every
  roster id) and `promote-roster` (only promotes vetted files, never clobbers without `-v2`/backup).
  Asset quality is judged visually by the curator (cannot be unit-tested).
- **Track B:** TDD the rasterizer (produces a PNG data URL from a config), the seed-hash invalidation
  (re-customizing changes the hash → render marked stale), and the additive display selector
  (render present → use it; absent/stale → live SVG). Provider call is mocked; no live generation in tests.

---

## 6. Out of scope (YAGNI)
- Animated/video avatars (Kling/Seedance) — future track, heavy storage + perf.
- Replacing the SVG builder — explicitly rejected (breaks reactivity).
- Live server-side generation — deferred until a server key + moderation are provisioned.
- Mood sticker packs — depends on Track B landing first.

---

## 6a. Pivot (2026-06-20, user steer: "we now have avatar config")

The live avatar system is the **procedural SVG builder** (`avatar_config`) — the 17 static PNGs are
legacy/fallback. So the **flagship is Track B** (per-user Glow-Up of the *config-built* avatar), not
Track A. Track A's pipeline (`brandStyle.mjs`) stays as an optional legacy-roster refresh; the broccoli
POC (`daily-content/avatar-roster-v2/broccoli-bob.png`) is retained as **proof-of-mechanism**:
reference image in → polished on-brand portrait out, 2048² PNG, clean neo-brutalist sticker style.

**Confirmed feasibility for the config anchor:** `AvatarRenderer` emits ONE serializable inline
`<svg viewBox="0 0 100 100">` of pure primitives (no external assets); `disableEffects` gives a clean
snapshot. So `rasterizeAvatar` is viable: config → SVG string → canvas → PNG → Higgsfield `--image`.

**Track B core built this session (flag-dark, TDD):**
- `lib/avatar/glowUpSeed.ts` — `computeAvatarSeedHash(config)` + `isRenderStale` (re-customize ⇒ stale).
- `lib/avatar/glowUpSelector.ts` — additive display selector (render present+fresh ⇒ portrait; else live SVG).
- `lib/avatar/rasterizeAvatar.ts` — `avatarToSvgString(config)` (testable) + browser canvas raster.
- `lib/avatar/glowUpProvider.ts` — provider boundary; impl stubbed (server Higgsfield key not provisioned).
- migration `profiles.avatar_render_url/status/seed_hash` (authored; null-safe; not enabled).
- admin-only entry point (`GlowUpButton` renders only for `useAuth().isAdmin`); the route is
  `verifyAdminAuth`-gated. (No PostHog flag yet — admin gate is the current control; flag comes with the
  rewarded-ad beta.)

**Implementation reality vs this spec (honest deltas):**
- The route imports the **CLI provider directly** (`cliGlowUpProvider`), not via `getGlowUpProvider()`.
  The `notProvisionedProvider` stub is now unused by the live admin path — it remains as the documented
  seam for the eventual non-CLI server-API provider.
- `selectAvatarDisplay` (the additive-only invariant) is **built + tested but not yet wired to a display
  surface.** Admins currently see the portrait as an **inline preview in the builder only**. Wiring it
  into ProfileHero / win-screen / share is the next step; until then "additive hero display" is designed,
  not live.
- Persistence is **best-effort**: the route returns the portrait URL even if the DB write fails, and
  reports `persisted: false`. Cross-surface display needs migration `20260620120000` applied.

## 6b. Production generation, cost & monetization (2026-06-20)

**Cost reality (verified via CLI):**
- Nano Banana 2 = **2 credits / generation**. Account = **ultra plan**, ~2233 credits on hand; credits
  were observed to *increase* across a few generations (plan likely refills). That's a 2-datapoint
  inference, NOT a verified "unlimited" — treat prod-scale cost as an open question. Ad-gating caps burn
  regardless (can't generate faster than you watch ads).
- No separate "API key" product. Auth = **device-login bearer token** (`higgsfield auth token`).

**Prod path — VERIFIED live (2026-06-20), pure HTTP, no CLI binary:**
- Base `https://fnf.higgsfield.ai`, `Authorization: Bearer <token>`.
- Upload: `POST /agents/uploads?type=image&content_type=image/png&filename=ref.png&length=N` → `{id, upload_url}`
  → `PUT upload_url` (Content-Type image/png, raw bytes) → `POST /agents/uploads/{id}/confirm?type=image`.
- Create: `POST /agents/jobs` body `{job_set_type:"nano_banana_2", params:{prompt, aspect_ratio:"1:1",
  resolution:"2k", input_images:[{id, type:"media_input"}]}}` → `["<jobId>"]`.
- Poll: `GET /agents/jobs/{jobId}` until `status:"completed"` → `result_url`.
- Implemented as `httpGlowUpProvider` in `glowUpProvider.server.ts`; `getServerGlowUpProvider()` picks
  HTTP in prod (or when `HIGGSFIELD_TOKEN`/`HIGGSFIELD_USE_HTTP=1`), else the CLI for local dev.

**Dynamic token refresh (no redeploy):** device tokens expire, so the token is NOT a static env var.
Resolver `getHiggsfieldToken()` reads `public.app_secrets` (service-role-only, RLS-on/no-policies) with a
~30s cache, falling back to `HIGGSFIELD_TOKEN` env. Rotate live via admin endpoint
`PUT /api/admin/higgsfield-token {token}` (paste a fresh `higgsfield auth token`); `GET` reports
`{configured, valid, plan, credits}` by probing `/agents/balance` (never returns the token). Needs
migration `20260620130000_add_app_secrets.sql` applied.

**Monetization — watch-ad to upgrade (user direction):** generation is gated behind a **rewarded ad**,
not (only) coins. This fits the existing economy exactly — `/api/avatar/claim-daily-part` + the daily
rewarded-ad part-claim flow already model "watch ad → unlock cosmetic." Glow-Up becomes another
rewarded-ad sink: watch ad → glow up your avatar. Ad revenue offsets the 2-credit cost and the ad-view
rate naturally throttles spend + abuse.

**Gating now = ADMIN ONLY (user direction).** Not public, not just flag-dark: the "Glow Up" entry point
is rendered only for admin users (existing admin-gate pattern) so the team can exercise the full live
pipeline (rasterize → generate → store → display) on real avatars before any public/ad-gated rollout.
Order of rollout: **admin-only → rewarded-ad beta → general**.

## 6c. Future — Track C: Selfie → Avatar (user idea, not now)

Let users upload a photo of themselves and generate an avatar from it (Higgsfield image-to-image / face
reference, same `--image` mechanism). High viral potential. Deferred: it massively raises the
moderation/privacy surface (real faces, minors, consent, storage of biometrics-adjacent data) and needs
its own spec. Captured here so the provider seam + storage are designed to accommodate it later.

## 6d. Glow-Up style — LOCKED (2026-06-20, iterated with user)

Flat re-trace ❌ → tested 3 directions (3D mascot / premium 2D / neon) → user picked **2D** → "more
caricature" → A (oversized head + tiny body) was best *style* but proportions wrong → user then chose to KEep the unproportional version + make it cute. FINAL =
**cute 2D caricature: oversized expressive head + small body (unproportional), big sparkly kawaii eyes,
big warm grin, soft rounded shapes, bold varying-weight lineart, glossy cel shading.** Lives in
`GLOW_UP_PROMPT` (`lib/avatar/glowUpProvider.ts`). Identity rides the `--image` reference, so MILD /
3D / neon variants remain swappable as a future "choose your style" picker. Iteration cost ~2 credits/gen.

**Identity-drift bug found + fixed:** the cute "big expressive eyes" cue made Nano Banana HALLUCINATE
glasses onto a no-glasses avatar. Fix = explicit negative guard in the prompt ("do NOT add glasses/hats/
any accessory not in the reference"). Verified gone on the no-glasses avatar. KNOWN RISK for GA: image
models can still drift on accessories — validate a sample before public rollout; consider Soul-ID for a
harder identity lock.

## 7. Decision log
- **Additive-only** (advisor): renders never replace the live reactive SVG. Locked.
- **Track A ships, Track B dark** (advisor): highest-certainty win lands; flagship is wired but inert.
- **Build-time vs runtime split** (CLI-is-local fact): curator generation now; per-user gen infra-gated.
- **Reference-anchored generation** (skill-confirmed `--image`): renders resemble the source character,
  not random AI faces — this is the entire personalization premise.
