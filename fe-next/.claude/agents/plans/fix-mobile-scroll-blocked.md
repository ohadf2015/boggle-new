# Fix Plan: Mobile Scroll Blocked

## Root Cause
Height resolution conflict between layout's `screen-fit-content` scroll container and pages using `min-h-screen` (viewport-relative heights). On mobile browsers with incomplete `dvh` support, content gets clipped.

## Fix Strategy
1. Remove `min-h-screen` from page root elements
2. Replace nested `<main>` elements with `<div>` or `<section>`
3. Let flex-based layout handle height naturally
4. Ensure backgrounds still cover full viewport using grow

## Priority Files (Most Used Pages)
1. `app/[locale]/settings/page.tsx` - Remove `min-h-screen`
2. `app/[locale]/rules/page.tsx` - Remove `min-h-screen`, change `<main>` to `<div>`
3. `app/[locale]/friends/page.tsx` - Remove `min-h-screen`, change `<main>` to `<div>`
4. `components/landing/LandingView.tsx` - Remove `min-h-screen`
5. `app/[locale]/contact/page.tsx` - Remove `min-h-screen`
6. `app/[locale]/brain/page.tsx` - Change nested `<main>` to `<div>`
7. `app/[locale]/admin/page.tsx` - Change nested `<main>` to `<div>`
8. `app/[locale]/admin/players/page.tsx` - Change nested `<main>` to `<div>`
9. `app/[locale]/admin/dictionary/page.tsx` - Change nested `<main>` to `<div>`
10. Other pages as listed in RCA

## Implementation Steps
1. Fix settings page (highest priority - frequently used)
2. Fix rules page
3. Fix friends page
4. Fix landing view
5. Fix contact page
6. Fix brain drills pages
7. Fix admin pages
8. Fix error/not-found pages
9. Fix component views (join, challenge, etc.)
10. Run tests and build

## Replacement Pattern

### Before (problematic):
```tsx
<div className="min-h-screen bg-neo-navy">
  <main>...</main>
</div>
```

### After (correct):
```tsx
<div className="flex-1 flex flex-col bg-neo-navy">
  <div>...</div>
</div>
```

## Testing Strategy
- Run `npm run build` to verify no compile errors
- Run `npm run test` to verify no test regressions
- Manual testing on mobile simulators

## Validation
- Build passes
- Tests pass
- Lint passes
