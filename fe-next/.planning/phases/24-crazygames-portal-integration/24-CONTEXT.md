# Phase 24: CrazyGames Portal Integration - Context

## User Requirements

**Core CrazyGames Requirements:**
1. Initial download size <50MB
2. Gameplay requirements - smooth performance
3. No external ads
4. No external login options (must use CrazyGames SDK for authentication)
5. Adheres to multiplayer requirements
6. Reload with Instant Multiplayer support
7. Game plays smoothly on mobile devices
8. Show QR Code functionality
9. Use the CrazyGames SDK
10. Landscape mode should look good on desktop without scroll

**Visual Consistency Requirements:**
- Many screens currently look different when embedded in CrazyGames portal
- **CRITICAL**: All screens should look the same as desktop view (or mobile view depending on the screen size) when running in CrazyGames portal
- The game should detect it's running in CrazyGames iframe but NOT change the visual layout/styling
- Only functional changes (SDK integration, auth flow, multiplayer invites) should differ from standalone version

## Expected Behavior

When running in CrazyGames portal:
- **Same visual appearance** as standalone desktop/mobile view
- **Different authentication** - use CrazyGames SDK instead of Google/Discord OAuth
- **Different multiplayer flow** - use SDK invite system instead of manual room codes
- **Same responsive behavior** - desktop styles for desktop iframe, mobile styles for mobile iframe
- **No layout shifts** - iframe embedding should not cause layout differences

## Design Constraints

- Maintain Neo-Brutalist design system (hard shadows, chunky borders)
- Preserve responsive breakpoints (desktop vs mobile)
- Keep all UI text translated (4 languages)
- Ensure RTL support for Hebrew remains functional
- No visual degradation when embedded in iframe

## Technical Approach

1. **Detection**: Use `window.parent !== window` to detect iframe embedding
2. **Feature Gating**: Only change SDK/auth behavior, not CSS/layout
3. **CSS Isolation**: Ensure game styles are not affected by parent frame styles
4. **Viewport Handling**: Respect iframe dimensions without breaking responsive design
