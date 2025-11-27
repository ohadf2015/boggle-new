## Goals
- Improve validation UX, accessibility, responsiveness, loading/feedback, and reliability across views
- Reduce UI defects and inconsistency by standardizing patterns and utilities
- Keep changes incremental and testable, focusing on `fe-next`

## Scope
- Views: `JoinView.jsx`, `host/HostView.jsx`, `player/PlayerView.jsx`, `app/[locale]/page.jsx`
- Components: `components/*`, `components/ui/*`, `GridComponent.jsx`, `CircularTimer.jsx`, `RoomChat.jsx`, `ErrorBoundary.jsx`
- Utilities: `utils/validation.js`, `utils/logger.js`, `contexts/LanguageContext.jsx`, `utils/accessibility.js`

## Validation UX
- Wire `utils/validation.js` into inputs: username, room name, game code, word submissions
- Create `useValidation` hook with `sanitizeInput`, live error messages via `t()` keys, and submit guards
- Replace ad-hoc checks in `JoinView.jsx`/`PlayerView.jsx` with centralized helpers and translated errors
- Standardize error display: inline messages + `react-hot-toast` for global failures; ensure RTL alignment
- Connect server-driven validation events: ensure `host.on('showValidation', ...)` maps to UI feedback consistently

## Error Handling
- Localize `app/components/ErrorBoundary.jsx` strings using `LanguageContext` and Tailwind classes
- Route caught errors to `utils/logger.js` and show a friendly, localized recovery UI
- Ensure socket errors and reconnect failures surface non-blocking toasts with retry

## Accessibility
- Add ARIA roles/labels to interactive grid cells and controls in `GridComponent.jsx`
- Ensure focus-visible rings and keyboard navigation for dialogs, menus, and game actions
- Respect `prefers-reduced-motion`: wrap `framer-motion`/`gsap` animations with motion-reduction guards
- Improve color contrast for status badges and timers; verify against Tailwind tokens

## Loading & Feedback
- Add consistent loading states for room list, grid generation, reconnection, and word submission
- Use shadcn `Skeleton` and `Spinner` components where applicable; avoid layout shift
- Confirm success/failure flows use `react-hot-toast` with localized messages

## Responsiveness & Layout
- Audit `HostView.jsx`/`PlayerView.jsx` for mobile breakpoints; ensure controls fit and grid is scrollable
- Use Tailwind responsive classes and container queries; fix overflow/clip issues on small screens
- Verify RTL rendering in Hebrew across headers, inputs, and grid

## Performance & Animations
- Consolidate animation usage: prefer one library (primary: `framer-motion`) for common transitions
- Lazy-load heavy components (results, large modals) and tree-shake icon sets
- Memoize expensive child components; use `@tanstack/react-virtual` for long lists (chat/history)

## Logging & Observability
- Replace `console.*` in UI flows with `utils/logger.js` for environment-aware logging
- Add breadcrumb logs for socket lifecycle in `app/[locale]/page.jsx`

## Refactor for Maintainability
- Extract logic from massive views into hooks: `useHostGame`, `usePlayerGame`, `useJoinRoom`
- Split UI into smaller components (status bars, control panels, word input) with clear props

## Internationalization
- Audit strings across views/components; replace hardcoded text with `t()` keys
- Ensure pluralization and locale-specific formats; default RTL where required

## Verification
- Add unit tests for `utils/validation.js` and hooks
- Run stress test script and manual flows: join, host, play, submit words, reconnect
- Check accessibility with keyboard-only usage and `prefers-reduced-motion`

## Deliverables
- Updated views and components with integrated validation and localized errors
- Accessible interactive grid and consistent loading/feedback patterns
- Reduced console noise and improved logging

## Rollback/Safety
- Guard changes behind small, incremental PR-ready patches per area
- Keep feature flags minimal; avoid server changes unless needed