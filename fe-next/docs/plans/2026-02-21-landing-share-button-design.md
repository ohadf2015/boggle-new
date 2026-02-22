# Landing Page Share Button — Design Doc

**Date:** 2026-02-21
**Feature:** Share button on landing page to invite friends and earn XP

---

## Problem

The referral/XP system is fully built (API, `ReferralCard`, XP grants) but buried in the profile page. The landing page only has a dismissible callout bubble above the tutorial FAB, which many users miss. A prominent, permanent share entry point on the landing page will increase viral reach.

---

## Requirements

- Visible to all users (guests and authenticated)
- Placement: below the mode cards (Multiplayer / Solo) — full-width in the grid
- Interaction: opens a share modal
- Authenticated users: see their referral code + "+100 XP per friend" incentive
- Guest users: see a generic share link + nudge to sign in for referral XP
- Remove the existing referral callout bubble from the FAB (it duplicates this feature)

---

## Architecture

```
LandingView.tsx
  └── LandingShareBanner.tsx        (new component, below mode cards)
        └── ShareReferralModal.tsx  (new modal component)
              └── useReferralShare.ts  (new hook)
```

All new files live in `fe-next/components/landing/`.

---

## Components

### `LandingShareBanner.tsx`

Compact neo-brutalist card (full-width, `sm:col-span-2`):
- Gift icon + "Invite Friends, Earn XP" headline
- "+100 XP per friend" subtext (auth) / "Play with friends!" (guest)
- "Share Game" CTA button with Share2 icon
- Framer Motion fade-in-up entrance (delayed ~0.2s after cards)
- No dismiss — this is a permanent feature

### `ShareReferralModal.tsx`

Bottom sheet on mobile, centered modal on desktop:
- Header: "Invite Friends & Earn XP"
- **Auth state:** referral code chip + "+100 XP when they join" reward message
- **Guest state:** "Sign in to get your personal link & earn XP" nudge + generic share link
- Share options: Copy Link, WhatsApp, Telegram, native Share
- Calls `/api/referral` lazily (only on modal open, only if authenticated)
- Tracks shares via `trackShare()` from `growthTracking.ts`
- AnimatePresence exit animation

### `useReferralShare.ts`

Custom hook for share logic:
```ts
const { shareUrl, referralCode, isLoading, copied, handleCopy, handleShare } = useReferralShare()
```
- If authenticated: fetch `/api/referral` → get `referralCode` + `shareUrl`
- If guest: `shareUrl = window.location.origin`, `referralCode = null`
- Handles WhatsApp / Telegram / native share methods
- `copied` state with 2s auto-reset for copy feedback

---

## Data Flow

```
User clicks banner
  → showShareModal = true
  → useReferralShare() initializes
  → if isAuthenticated: fetch('/api/referral')
  → if guest: use window.location.origin
  → user picks share method
  → trackShare(method) called
  → modal dismissed
```

---

## LandingView Changes

1. Add `LandingShareBanner` in the desktop grid (`sm:col-span-2`, after Solo card)
2. Add `LandingShareBanner` in the mobile/landscape grid (below the 2-col card grid)
3. Remove `showReferralCallout` state and the FAB referral callout bubble (deprecated by banner)
4. Import `ShareReferralModal` (lazy/dynamic to avoid initial bundle impact)

---

## Translations

New keys (all 4 languages: en, he, sv, ja, es):

| Key | English |
|-----|---------|
| `landing.shareTitle` | "Invite Friends, Earn XP" |
| `landing.shareSubtitle` | "100 XP per friend who joins" |
| `landing.shareSubtitleGuest` | "Play with friends!" |
| `landing.shareButton` | "Share Game" |
| `landing.shareModalTitle` | "Invite Friends & Earn XP" |
| `landing.shareXpReward` | "You earn +100 XP when they join!" |
| `landing.shareGuestNudge` | "Sign in to get your personal link & earn XP" |

---

## Tests

| File | What it tests |
|------|--------------|
| `__tests__/LandingShareBanner.test.tsx` | Renders, auth vs guest text, share button click |
| `__tests__/ShareReferralModal.test.tsx` | Open/close, copy works, guest vs auth states, share buttons present |
| `__tests__/useReferralShare.test.ts` | API call when auth'd, fallback URL for guests, copy state reset |

---

## Out of Scope

- Backend changes (referral system already complete)
- New XP tiers or reward amounts
- Share card image generation (use text-only share for now)
