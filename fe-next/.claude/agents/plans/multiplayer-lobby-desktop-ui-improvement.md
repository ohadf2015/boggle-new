# Feature: Improve Multiplayer In-Game Lobby Desktop UI

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Redesign and enhance the multiplayer in-game lobby (HostPreGameView and PlayerWaitingView) to provide a significantly better desktop experience. The current implementation uses mobile-first design with `lg:hidden` tabs and cramped layouts that don't utilize desktop screen real estate effectively. The goal is to create a visually stunning, spacious, and functional desktop layout that maintains the Neo-Brutalist design system while feeling premium on larger screens.

## User Story

As a multiplayer game host or player on desktop
I want a visually impressive and functional lobby experience
So that I can enjoy the pre-game phase with a layout that uses my screen space well

## Problem Statement

The current desktop lobby implementation has several issues:
1. **Cramped Layout**: Desktop view is essentially the same as mobile but wider, not utilizing horizontal space
2. **No Visual Hierarchy**: All elements have similar visual weight, making it hard to focus
3. **Minimal Game Preview**: No grid/board preview or game preparation visuals
4. **Basic Player List**: Just names in a list without engaging presentation
5. **Hidden Advanced Features**: Bot controls and settings buried under collapsibles
6. **No Decorative Elements**: Missing the playful Neo-Brutalist decorations present elsewhere in the app
7. **Inconsistent Card Styling**: Mix of styling approaches instead of unified design

## Solution Statement

Create a redesigned desktop layout with:
1. **Three-Column Layout**: Left (Settings/Controls), Center (Game Preview/Invite Area), Right (Players/Chat)
2. **Visual Game Preview**: Show a decorative preview grid or animated "waiting" display
3. **Premium Card Styling**: Consistent Neo-Brutalist cards with gradient accents and decorative elements
4. **Enhanced Player List**: Avatar-centric player cards with presence indicators
5. **Prominent Invite Section**: Large QR code and share options in center column
6. **Exposed Key Controls**: Presets, timer, and start button always visible (not collapsed)
7. **Playful Decorations**: Floating elements, subtle animations, parallax effects

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** High
**Primary Systems Affected:** `host/components/HostPreGameView.tsx`, `player/components/PlayerWaitingView.tsx`, pre-game sub-components
**Dependencies:** Existing UI components, Neo-Brutalist design system, framer-motion

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `host/components/HostPreGameView.tsx` (full file)
  - **WHY:** Main host lobby component to redesign
  - **PATTERN:** Uses mobile tabs + desktop side-by-side, needs complete desktop layout overhaul

- `player/components/PlayerWaitingView.tsx` (full file)
  - **WHY:** Player waiting view that needs matching desktop redesign
  - **PATTERN:** Similar structure to HostPreGameView, needs consistent treatment

- `host/components/pre-game/PresetSelector.tsx` (full file)
  - **WHY:** Current preset UI that needs desktop enhancement
  - **PATTERN:** Compact preset buttons, could be larger cards on desktop

- `host/components/pre-game/StartButton.tsx` (full file)
  - **WHY:** Start button that needs prominent desktop placement
  - **PATTERN:** Full-width button, needs to be visually prominent

- `host/components/pre-game/MobileBottomNav.tsx` (full file)
  - **WHY:** Mobile-only navigation, should remain hidden on desktop
  - **PATTERN:** Tab navigation with badges

- `components/landing/LandingView.tsx` (lines 230-570)
  - **WHY:** Contains desktop layout patterns, card styling, and animations to mirror
  - **PATTERN:** Grid layouts, ModeCard usage, parallax effects, responsive breakpoints

- `components/multiplayer/MultiplayerLobby.tsx` (full file)
  - **WHY:** Pre-room lobby that should have consistent styling with in-game lobby
  - **PATTERN:** Side-by-side layout, gradient accents, decorative elements

- `components/BotControls.tsx` (full file)
  - **WHY:** Bot management UI that needs to be more prominent on desktop
  - **PATTERN:** Collapsible section, could be expanded panel on desktop

- `components/RoomChat.tsx`
  - **WHY:** Chat component that needs proper desktop sizing
  - **PATTERN:** Full-height chat with input

- `tailwind.config.js` (lines 49-210, 219-250, 264-450)
  - **WHY:** Contains Neo-Brutalist design tokens and animations
  - **PATTERN:** neo-* colors, shadow-hard-*, rounded-neo, animations

- `components/__tests__/MultiplayerDesktopFunctionality.test.tsx` (full file)
  - **WHY:** Existing tests for desktop functionality that must continue to pass
  - **PATTERN:** Tests for desktop chat visibility, start button accessibility

### New Files to Create

1. `host/components/pre-game/desktop/DesktopLobbyLayout.tsx` - Desktop-specific three-column layout wrapper
2. `host/components/pre-game/desktop/InviteCard.tsx` - Prominent QR code and invite section
3. `host/components/pre-game/desktop/GamePreviewCard.tsx` - Animated game preview/waiting display
4. `host/components/pre-game/desktop/EnhancedPlayerList.tsx` - Avatar-centric player cards
5. `host/components/pre-game/desktop/SettingsPanel.tsx` - Exposed settings panel for desktop
6. `host/components/pre-game/desktop/index.ts` - Barrel exports

### Patterns to Follow

**Three-Column Desktop Layout Pattern:**

```tsx
// ✅ GOOD: Desktop-specific layout with clear sections
<div className="hidden lg:grid lg:grid-cols-[300px_1fr_320px] gap-6 h-full p-6">
  {/* Left Column - Settings & Controls */}
  <aside className="flex flex-col gap-4">
    <SettingsPanel />
    <BotControls />
  </aside>

  {/* Center Column - Hero/Preview Area */}
  <main className="flex flex-col items-center justify-center gap-6">
    <GamePreviewCard />
    <InviteCard />
    <StartButton />
  </main>

  {/* Right Column - Players & Chat */}
  <aside className="flex flex-col gap-4">
    <EnhancedPlayerList />
    <RoomChat />
  </aside>
</div>
```

**Premium Card Pattern:**

```tsx
// ✅ GOOD: Neo-Brutalist card with gradient accent
<div className="relative rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard-lg overflow-hidden">
  {/* Decorative top accent bar */}
  <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime" />

  {/* Card content with proper spacing */}
  <div className="p-4 pt-6">
    {/* ... */}
  </div>
</div>
```

**Enhanced Player Card Pattern:**

```tsx
// ✅ GOOD: Avatar-centric player display
<motion.div
  className="flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black/50 bg-white/5 hover:bg-white/10 transition-all"
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
>
  <Avatar size="lg" {...avatarProps} />
  <div className="flex-1 min-w-0">
    <span className="font-bold text-neo-cream truncate">{name}</span>
    <div className="flex items-center gap-2 text-xs text-neo-cream/60">
      {isHost && <Crown className="w-3 h-3 text-neo-yellow" />}
      {isBot && <Bot className="w-3 h-3 text-neo-cyan" />}
    </div>
  </div>
  <PresenceIndicator status={presence} />
</motion.div>
```

**Invite Card Pattern:**

```tsx
// ✅ GOOD: Prominent invite section
<div className="bg-linear-to-br from-neo-pink/20 to-neo-cyan/20 rounded-neo-lg border-4 border-neo-black p-6 shadow-hard-lg">
  <div className="text-center mb-4">
    <h2 className="text-2xl font-black text-neo-white uppercase">
      {t('hostView.inviteFriends')}
    </h2>
    <p className="text-neo-cream/70 text-sm">{t('hostView.scanOrShare')}</p>
  </div>

  <div className="flex justify-center">
    <div className="p-4 bg-white rounded-neo border-4 border-neo-black shadow-hard">
      <QRCodeSVG value={joinUrl} size={180} />
    </div>
  </div>

  <div className="mt-4 flex flex-wrap gap-2 justify-center">
    <ShareButton variant="copy" />
    <ShareButton variant="whatsapp" />
  </div>
</div>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Create Desktop Layout Components

Create the foundational desktop-specific components that will house the new layout.

**Tasks:**
- Create barrel export file for desktop components
- Create DesktopLobbyLayout component with three-column grid
- Create skeleton structure for each column

**Order:** These tasks must be completed first as other components depend on this structure.

### Phase 2: Settings & Controls Panel

Build the left column settings panel that exposes presets, timer, and game options.

**Tasks:**
- Create SettingsPanel component with expanded preset view
- Integrate timer controls
- Add TV mode toggle prominently
- Ensure BotControls is expanded by default on desktop

**Order:** Depends on Phase 1 completion.

### Phase 3: Central Hero Section

Build the center column with game preview and invite functionality.

**Tasks:**
- Create GamePreviewCard with animated waiting display
- Create InviteCard with QR code and share buttons
- Ensure StartButton is prominently placed
- Add decorative floating elements

**Order:** Depends on Phase 1 completion.

### Phase 4: Players & Chat Panel

Build the right column with enhanced player list and chat.

**Tasks:**
- Create EnhancedPlayerList with avatar-centric cards
- Configure RoomChat for proper desktop sizing
- Add unread indicators and smooth transitions

**Order:** Depends on Phase 1 completion.

### Phase 5: Integration & Polish

Integrate all desktop components into HostPreGameView and PlayerWaitingView.

**Tasks:**
- Update HostPreGameView to use desktop layout at lg: breakpoint
- Update PlayerWaitingView to use matching desktop layout
- Add subtle animations and transitions
- Add decorative background elements

**Order:** Depends on Phases 2, 3, 4 completion.

### Phase 6: Testing & Validation

Ensure all functionality works correctly and tests pass.

**Tasks:**
- Verify existing desktop functionality tests pass
- Add new tests for desktop layout rendering
- Manual testing across breakpoints
- RTL testing for Hebrew

**Order:** Depends on Phase 5 completion.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `host/components/pre-game/desktop/index.ts`

- **IMPLEMENT:** Barrel export file for desktop components
- **PATTERN:** Standard barrel export pattern
- **IMPORTS:** Export all desktop components
- **GOTCHA:** Export types as well
- **VALIDATE:** `npm run lint`

### Task 2: CREATE `host/components/pre-game/desktop/DesktopLobbyLayout.tsx`

- **IMPLEMENT:** Three-column grid layout wrapper for desktop
  - Use `grid-cols-[300px_1fr_320px]` for proportional columns
  - Accept children for each section via render props or slots
  - Include container styling with max-width and centering
  - Add subtle background gradient
- **PATTERN:** Reference MultiplayerLobby.tsx lines 376-490 for layout approach
- **IMPORTS:** `cn` from `@/lib/utils`, framer-motion for animations
- **GOTCHA:** Ensure proper min-height handling for full viewport
- **VALIDATE:** `npm run lint`

### Task 3: CREATE `host/components/pre-game/desktop/SettingsPanel.tsx`

- **IMPLEMENT:** Left column settings panel
  - Large preset cards (not tiny buttons) with icons and descriptions
  - Timer display/selector prominently shown
  - TV Mode toggle with clear label
  - Room code display with copy button
  - Decorative card styling with gradient accent
- **PATTERN:** Reference PresetSelector.tsx for preset data, enhance sizing
- **IMPORTS:** PresetKey, GAME_PRESETS from PresetSelector, lucide icons
- **GOTCHA:** Must call parent callbacks to update state
- **VALIDATE:** `npm run lint`

### Task 4: CREATE `host/components/pre-game/desktop/GamePreviewCard.tsx`

- **IMPLEMENT:** Center column hero/preview section
  - Animated "Waiting for players" display with pulsing dots
  - Decorative mini-grid or game preview (5x5 empty cells)
  - Player count badge prominently displayed
  - Optional: Animated mascot or game icons
- **PATTERN:** Reference LandingView.tsx for animation patterns
- **IMPORTS:** framer-motion, lucide icons
- **GOTCHA:** Keep animations subtle and performant
- **VALIDATE:** `npm run lint`

### Task 5: CREATE `host/components/pre-game/desktop/InviteCard.tsx`

- **IMPLEMENT:** Center column invite section
  - Large QR code (180px+) with white background
  - Room code in large text
  - Copy button with feedback
  - Share buttons (WhatsApp, copy link, etc.)
  - Gradient background accent
- **PATTERN:** Reference existing QR code usage in PlayerWaitingView.tsx
- **IMPORTS:** QRCodeSVG from qrcode.react, getJoinUrl from utils/share
- **GOTCHA:** Handle clipboard API failure gracefully
- **VALIDATE:** `npm run lint`

### Task 6: CREATE `host/components/pre-game/desktop/EnhancedPlayerList.tsx`

- **IMPLEMENT:** Right column player list with enhanced cards
  - Large avatars (40px+) with Avatar component
  - Player name with host/bot badges
  - Presence indicator for each player
  - Animated entry/exit for players
  - Host "you" badge for current user
  - Scrollable container with proper height
- **PATTERN:** Reference HostPreGameView.tsx lines 209-254 for player mapping
- **IMPORTS:** Avatar, PresenceIndicator, framer-motion, player types
- **GOTCHA:** Handle string vs object player types
- **VALIDATE:** `npm run lint`

### Task 7: UPDATE `host/components/pre-game/desktop/index.ts`

- **IMPLEMENT:** Export all created components
- **PATTERN:** Standard barrel exports
- **VALIDATE:** `npm run lint`

### Task 8: UPDATE `host/components/HostPreGameView.tsx`

- **IMPLEMENT:** Integrate desktop layout at lg: breakpoint
  - Import desktop components
  - Add conditional rendering for desktop view (hidden lg:flex)
  - Keep existing mobile view intact (lg:hidden)
  - Pass all necessary props to desktop components
  - Move BotControls to SettingsPanel for desktop
  - Ensure StartButton is in central area
  - Connect all state and callbacks
- **PATTERN:** Reference existing desktop/mobile split pattern
- **IMPORTS:** Desktop components from ./pre-game/desktop
- **GOTCHA:** Don't break mobile functionality, maintain all existing props flow
- **VALIDATE:** `npm run test -- --testPathPattern=HostPreGameView`

### Task 9: UPDATE `player/components/PlayerWaitingView.tsx`

- **IMPLEMENT:** Add matching desktop layout
  - Use same three-column approach but without host controls
  - Left column: Game info (room code, language, timer estimate)
  - Center column: QR code + waiting animation
  - Right column: Players list + chat
  - Maintain visual consistency with host view
- **PATTERN:** Mirror HostPreGameView desktop structure
- **IMPORTS:** Reuse InviteCard, EnhancedPlayerList where appropriate
- **GOTCHA:** No settings panel for players, adapt layout
- **VALIDATE:** `npm run test -- --testPathPattern=PlayerWaitingView`

### Task 10: CREATE `host/components/pre-game/desktop/__tests__/DesktopLobbyLayout.test.tsx`

- **IMPLEMENT:** Unit tests for desktop layout
  - Test three-column rendering
  - Test responsive breakpoint behavior
  - Test children slot rendering
- **PATTERN:** Reference MultiplayerDesktopFunctionality.test.tsx
- **IMPORTS:** Testing library, React
- **VALIDATE:** `npm run test -- --testPathPattern=DesktopLobbyLayout`

### Task 11: RUN `existing desktop tests`

- **IMPLEMENT:** Verify existing tests still pass
- **VALIDATE:** `npm run test -- --testPathPattern=MultiplayerDesktop`

### Task 12: RUN `build verification`

- **IMPLEMENT:** Ensure build succeeds
- **VALIDATE:** `npm run build`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test desktop layout component renders all three columns
- Test SettingsPanel renders presets and controls
- Test InviteCard displays QR code and handles copy
- Test EnhancedPlayerList renders players with avatars
- Test GamePreviewCard shows waiting animation

**Pattern:**

```tsx
describe('DesktopLobbyLayout', () => {
  it('renders three-column layout on lg screens', () => {
    render(
      <DesktopLobbyLayout
        leftContent={<div data-testid="left">Left</div>}
        centerContent={<div data-testid="center">Center</div>}
        rightContent={<div data-testid="right">Right</div>}
      />
    );

    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test HostPreGameView desktop view shows all sections
- Test chat and players are visible on desktop (not hidden behind tabs)
- Test start button is accessible on desktop
- Test copy code functionality works

**Pattern:**

```tsx
describe('HostPreGameView Desktop Integration', () => {
  it('should show chat content on desktop (not hidden behind tabs)', () => {
    render(<HostPreGameView {...defaultHostProps} />);
    const desktopChatArea = screen.queryByTestId('desktop-chat-area');
    expect(desktopChatArea).toBeInTheDocument();
  });
});
```

### Edge Cases

- Empty player list (0 players)
- Maximum players (8 players)
- Long player names (truncation)
- RTL layout (Hebrew)
- Various viewport sizes at lg breakpoint

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No TypeScript errors

### Level 2: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test -- --testPathPattern="HostPreGameView|PlayerWaitingView|DesktopLobby|MultiplayerDesktop" --passWithNoTests
```

**Expected:** All tests pass

### Level 4: Full Test Suite

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test
```

**Expected:** All tests pass

### Level 5: Build Verification

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build completes successfully

### Level 6: Manual Validation

1. Start dev server: `npm run dev`
2. Navigate to `/en/multiplayer`
3. Create a room
4. Verify desktop layout appears at 1024px+ viewport width
5. Verify three-column layout is visible
6. Verify QR code is displayed
7. Verify player list shows
8. Verify chat is accessible without tabs
9. Verify start button is visible and functional
10. Verify presets can be changed
11. Test in Hebrew for RTL support

---

## ACCEPTANCE CRITERIA

- [ ] Desktop view (lg:) shows three-column layout
- [ ] All functionality accessible without mobile tab bar
- [ ] QR code prominently displayed for invites
- [ ] Player list shows avatars and presence
- [ ] Presets are visually prominent and easy to change
- [ ] Start button is easily accessible
- [ ] Chat is visible alongside other content
- [ ] All existing tests pass
- [ ] Build succeeds without errors
- [ ] RTL (Hebrew) layout works correctly
- [ ] Mobile layout unchanged (still uses tabs)
- [ ] No visual regression in mobile view

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why three-column layout?** Desktop screens have horizontal space that should be utilized. Three columns provide clear visual separation of concerns: controls, main content, and social/communication.
- **Why larger avatars?** On desktop, users have more space and expect richer visuals. Larger avatars make the experience feel more premium.
- **Why exposed settings?** Unlike mobile where collapsing saves space, desktop can show all options without overwhelming the user.

**Alternatives Considered:**

1. **Two-column layout** - Rejected because it doesn't differentiate enough from mobile
2. **Full-width cards** - Rejected because it wastes horizontal space
3. **Sidebar drawer** - Rejected because it hides content unnecessarily

**Trade-offs:**

- More code to maintain (desktop + mobile views)
- Slightly larger bundle size for desktop components
- Need to keep both views in sync

**Future Considerations:**

- Could add customizable layout options
- Could add more decorative animations for premium feel
- Could integrate video chat or screen sharing preview

**Known Limitations:**

- Doesn't change tablet experience (between md and lg breakpoints)
- Animations may be reduced for users with `prefers-reduced-motion`
