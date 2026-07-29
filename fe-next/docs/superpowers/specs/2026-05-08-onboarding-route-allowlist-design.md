# Onboarding Route Allowlist — Defensive Guard

**Date**: 2026-05-08
**Status**: Spec → ready for implementation
**Owner**: ohadfisher

## Problem

User concern: ensure new players visiting blog (`/[locale]/blog/*`) and other non-game pages do NOT see the FTUE onboarding flow, while homepage continues to trigger it for new users.

## Current State

- `OnboardingFlow` mounts only inside `app/[locale]/PageClient.tsx` (the locale homepage `page.tsx`).
- Loaded via `dynamic(... ssr: false)` — never rendered server-side.
- Trigger: `isNewUser && user clicks Play CTA in LandingView` → `setShowFTUE(true)`.
- New-user detection: `!hasCompletedOnboarding() && !hasSupabaseSession()` (localStorage).
- Blog routes (`/[locale]/blog/*`) live in their own page tree and never import `HomePageClient` or `OnboardingFlow`.

**Verdict**: blog already structurally bypasses onboarding. No bug today. This spec adds a *defensive* guard to keep it that way.

## Goal

Lock the FTUE mount to homepage-only via an explicit, tested pathname allowlist. If anyone later hoists OnboardingFlow into a higher layout, the guard prevents it from rendering on blog/SEO/legal pages.

## Non-Goals

- Auto-firing onboarding on game routes (`/multiplayer`, `/daily`, …) for deep-link landings — rejected (Approach B) due to SEO bounce risk.
- Server-side new-user detection / cookie sync — rejected (Approach C) as too heavy.
- Changing existing FTUE UX, persistence, or analytics events.

## Design

### Module: `lib/onboarding/allowedRoutes.ts`

```ts
import { locales } from '@/i18n/config';

const LOCALE_ROOT = new RegExp(`^/(?:${locales.join('|')})?/?$`);

export function isOnboardingAllowedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = pathname.split('?')[0].split('#')[0];
  return LOCALE_ROOT.test(stripped);
}
```

Accepts: `/`, `/en`, `/en/`, `/he`, `/sv`, `/ja`, `/es`, with optional trailing slash + query/hash.
Rejects: any pathname with a non-empty path segment after the locale (`/en/blog/foo`, `/he/multiplayer`, `/sv/legal`, `/word-of-the-day`).

### Wire into `HomePageClient`

```tsx
const pathname = usePathname();
const routeAllowsOnboarding = isOnboardingAllowedRoute(pathname);

const handleStartOnboarding = useCallback(() => {
  if (!routeAllowsOnboarding) return; // defensive
  setShowFTUE(true);
}, [routeAllowsOnboarding]);

if (showFTUE && routeAllowsOnboarding) {
  return <OnboardingFlow onComplete={handleFTUEComplete} />;
}
```

Today PageClient only renders at homepage so the guard always passes — pure defensive layer that catches future regressions.

## SEO Impact

- **Server HTML unchanged**: `OnboardingFlow` is `dynamic(ssr:false)`. Crawlers (Googlebot, Bingbot) see identical HTML before and after this change.
- **No metadata / robots / sitemap changes**.
- **No critical-path JS added** to blog/SEO routes — guard prevents future hoist from injecting OnboardingFlow chunk into bundles for those pages.
- **CWV neutral**: one `usePathname()` call (already used elsewhere in the route tree).
- **Defensive SEO bonus**: protects against a future CLS/INP regression if anyone moves the FTUE mount up to `[locale]/layout.tsx`.

## Testing

### Unit (`lib/onboarding/__tests__/allowedRoutes.test.ts`)

Allow:
- `/`, `/en`, `/en/`, `/he`, `/he/`, `/sv`, `/ja`, `/es`
- `/en?utm=x`, `/en/#hash`

Reject (SEO-relevant paths):
- `/en/blog/best-boggle-alternatives-2026`
- `/en/blog/boggle-vs-scrabble`
- `/en/word-of-the-day`
- `/en/best-online-word-games`
- `/he/multiplayer`
- `/sv/legal`
- `/en/brain-training-word-games`
- `/en/play-boggle-online-free`

Edge:
- `null`, `undefined`, `''` → false
- `/foo` (no locale prefix) → false
- `/EN` (uppercase) → false (Next normalizes to lowercase)

### Integration

- Existing `app/[locale]/PageClient.invite.test.tsx` + `OnboardingFlow.*.test.tsx` continue to pass (homepage path triggers FTUE on CTA).
- New: `PageClient` rendered with `usePathname` mocked to `/en/blog/foo` → CTA click does not set `showFTUE`.

## Acceptance

- `npm run lint` clean
- `npm run test` green (new + existing)
- `npm run build` succeeds
- Manual: load `/en/blog/best-boggle-alternatives-2026` as fresh user → no FTUE
- Manual: load `/en` as fresh user → CTA visible → click → FTUE renders

## Files

- `fe-next/lib/onboarding/allowedRoutes.ts` (new, ~20 LOC)
- `fe-next/lib/onboarding/__tests__/allowedRoutes.test.ts` (new, ~50 LOC)
- `fe-next/app/[locale]/PageClient.tsx` (edit, +5 LOC)
