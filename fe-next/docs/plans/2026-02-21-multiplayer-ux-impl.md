# Multiplayer UX Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix double-scroll layout bugs and improve UX hierarchy across all 4 multiplayer screens (lobby, pre-game host/player, in-game player, post-game results).

**Architecture:** All subviews (PlayerWaitingView, PlayerInGameView, ResultsPage) must use `flex-1 flex flex-col min-h-0` instead of `h-dvh` because `PageClient.tsx` already constrains the shell to `h-dvh overflow-hidden`. Scroll boundaries must be singular — exactly one element per scroll chain should have `overflow-y-auto`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS (neo-brutalist design system), React Testing Library, Jest

---

## Context: Files to Modify

| File | Why |
|------|-----|
| `fe-next/components/multiplayer/RoomListView.tsx` | Double overflow-y-auto + Friend Activity removal |
| `fe-next/player/components/PlayerWaitingView.tsx` | h-dvh fights parent, missing flex on main |
| `fe-next/host/components/HostPreGameView.tsx` | Chat height, "you" ring, label rename, TV Mode visibility |
| `fe-next/player/components/PlayerInGameView.tsx` | h-dvh and min-h-dvh fight parent |
| `fe-next/components/views/ResultsPage.tsx` | min-h-dvh fights parent |
| `fe-next/translations/en.js` + `he.js` + `sv.js` + `ja.js` | Add `hostView.roomChat` key |

## Test commands
```bash
cd fe-next && npm run test:frontend -- --testPathPattern="RoomListView|PlayerWaiting|HostPreGame|PlayerInGame|ResultsPage|multiplayer-ux"
npm run lint
npm run build
```

---

## Task 1: Fix RoomListView — Double Scroll

**Files:**
- Modify: `fe-next/components/multiplayer/RoomListView.tsx` lines 71–75, 111, 159–188
- Test (new): `fe-next/components/multiplayer/__tests__/RoomListView.ux-layout.test.tsx`

### Step 1: Write the failing test

Create `fe-next/components/multiplayer/__tests__/RoomListView.ux-layout.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 * Tests for RoomListView UX layout fixes:
 * - No double scroll (outer container must not have overflow-y-auto)
 * - Friend Activity section removed
 * - Active Battles visible in initial render
 */
import fs from 'fs';
import path from 'path';

describe('RoomListView UX layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../RoomListView.tsx'),
      'utf-8'
    );
  });

  it('outer scroll container does NOT have overflow-y-auto (no double scroll)', () => {
    // The outer container (flex-1 min-h-0 bg-neo-navy) must NOT also have overflow-y-auto
    // Only the inner content div should scroll
    // Detect: both "flex-1 min-h-0" and "overflow-y-auto" must not appear on the SAME className line
    // Strategy: find all lines with className that include both "min-h-0" and "overflow-y-auto"
    const lines = source.split('\n');
    const problematicLines = lines.filter(
      (line) => line.includes('min-h-0') && line.includes('overflow-y-auto') && line.includes('bg-neo-navy')
    );
    expect(problematicLines).toHaveLength(0);
  });

  it('does NOT render Friend Activity section', () => {
    // Friend Activity section must be removed - translation key no longer in template
    expect(source).not.toContain('friendActivity');
    expect(source).not.toContain('noFriendsOnline');
    expect(source).not.toContain('invitePrompt');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="RoomListView.ux-layout" --no-coverage
```

Expected: FAIL — "friendActivity" still found in source.

### Step 3: Implement the fix in RoomListView.tsx

**Change 1 — Remove `overflow-y-auto` from outer container (line 71-73):**

Old:
```tsx
className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-neo-navy relative flex flex-col max-w-5xl mx-auto"
```

New:
```tsx
className="flex-1 min-h-0 bg-neo-navy relative flex flex-col max-w-5xl mx-auto"
```

**Change 2 — Remove entire Friend Activity section (lines 159–188):**

Remove this entire block:
```tsx
          {/* Friend Activity Section */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <h2 className="font-neo-display font-black uppercase text-xs tracking-widest text-white/50">
              {t('multiplayerFlow.roomList.friendActivity') || 'Friend Activity'}
            </h2>

            {/* Empty State: No friends online */}
            <div className="bg-neo-navy-light/50 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-neo-navy border-3 border-neo-black rounded-2xl flex items-center justify-center mb-4 shadow-hard-sm">
                <Users className="w-8 h-8 text-neo-cream/30" />
              </div>
              <h3 className="text-neo-white font-bold text-sm mb-1 uppercase">
                {t('multiplayerFlow.roomList.noFriendsOnline') || 'No friends online yet'}
              </h3>
              <p className="text-slate-500 text-[10px] mb-5 font-medium leading-relaxed uppercase tracking-wider">
                {t('multiplayerFlow.roomList.invitePrompt') || 'Start a party by sending an invite link'}
              </p>
              <button
                onClick={onCreateRoom}
                className="bg-neo-pink border-3 border-neo-black shadow-hard-sm px-6 py-2 rounded-lg text-neo-black font-black text-[10px] uppercase tracking-wider hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
              >
                {t('multiplayerFlow.roomList.inviteFriends') || 'Invite Friends'}
              </button>
            </div>
          </motion.section>
```

**Change 3 — Remove `Users` from import if no longer used after removal:**

Check if `Users` is still used elsewhere in the file (it is — in `totalPlayers` count). Keep it.

**Change 4 — Fix the grid layout after removing Friend Activity:**

The grid is currently `grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6`. After removing Friend Activity the right column just has Active Battles. Update the grid and left column wrapper:

Old (line 112-115):
```tsx
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">

          {/* Left Column: Quick Play CTA */}
          <div className="lg:sticky lg:top-0 lg:self-start">
```

New (keep grid but update structure so it works without Friend Activity):
```tsx
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-6">

          {/* Left Column: Quick Play CTA */}
          <div className="lg:sticky lg:top-4 lg:self-start">
```

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="RoomListView.ux-layout" --no-coverage
```

Expected: PASS

### Step 5: Run existing RoomListView tests to make sure nothing broke

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="RoomListView" --no-coverage
```

Expected: All PASS

### Step 6: Commit

```bash
cd fe-next && git add components/multiplayer/RoomListView.tsx components/multiplayer/__tests__/RoomListView.ux-layout.test.tsx
git commit -m "fix(ux): remove double scroll and Friend Activity empty state from lobby"
```

---

## Task 2: Fix PlayerWaitingView — h-dvh Layout

**Files:**
- Modify: `fe-next/player/components/PlayerWaitingView.tsx` lines 190, 237, 268
- Test (new): `fe-next/__tests__/components/PlayerWaitingView.layout.test.tsx`

### Step 1: Write the failing test

Create `fe-next/__tests__/components/PlayerWaitingView.layout.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 * Tests for PlayerWaitingView layout fix:
 * - Root div must not use h-dvh (parent PageClient already constrains height)
 * - main element must be flex flex-col for mobile scroll to work
 */
import fs from 'fs';
import path from 'path';

describe('PlayerWaitingView layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../player/components/PlayerWaitingView.tsx'),
      'utf-8'
    );
  });

  it('root div uses flex-1 min-h-0 instead of h-dvh', () => {
    // Root div should NOT use h-dvh (PageClient already has h-dvh)
    // Should use flex-1 min-h-0 to fill parent
    expect(source).not.toMatch(/className="h-dvh flex flex-col bg-neo-navy/);
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-navy');
  });

  it('main element uses flex flex-col for mobile scroll chain', () => {
    // main must be flex flex-col so its flex-1 children can take height
    expect(source).toContain('flex-1 min-h-0 overflow-hidden flex flex-col');
  });

  it('mobile layout div uses flex-1 min-h-0 instead of h-full', () => {
    // lg:hidden div must not use bare h-full — needs flex-1 min-h-0
    expect(source).not.toContain('"lg:hidden h-full"');
    expect(source).toContain('lg:hidden flex flex-col flex-1 min-h-0');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerWaitingView.layout" --no-coverage
```

Expected: FAIL

### Step 3: Implement the fix in PlayerWaitingView.tsx

**Change 1 — Root div (line 190):**

Old:
```tsx
    <div className="h-dvh flex flex-col bg-neo-navy lg:max-w-7xl lg:mx-auto">
```

New:
```tsx
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
```

**Change 2 — main element (line 237):**

Old:
```tsx
      <main className="flex-1 min-h-0 overflow-hidden bg-neo-navy/95">
```

New:
```tsx
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-neo-navy/95">
```

**Change 3 — Mobile layout div (line 268):**

Old:
```tsx
        <div className="lg:hidden h-full">
```

New:
```tsx
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
```

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerWaitingView.layout" --no-coverage
```

Expected: PASS

### Step 5: Commit

```bash
cd fe-next && git add player/components/PlayerWaitingView.tsx __tests__/components/PlayerWaitingView.layout.test.tsx
git commit -m "fix(ux): replace h-dvh with flex-1 in PlayerWaitingView to respect parent constraint"
```

---

## Task 3: Fix HostPreGameView — Chat Height, "You" Ring, Label, TV Mode

**Files:**
- Modify: `fe-next/host/components/HostPreGameView.tsx`
- Test (new): `fe-next/__tests__/HostPreGameView.ux-improvements.test.tsx`

### Step 1: Write the failing test

Create `fe-next/__tests__/HostPreGameView.ux-improvements.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 * Tests for HostPreGameView UX improvements:
 * - Chat uses responsive height (not fixed h-72)
 * - "Battle Feed" label renamed to roomChat translation key
 * - TV Mode visible outside Advanced Settings accordion
 */
import fs from 'fs';
import path from 'path';

describe('HostPreGameView UX improvements', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../host/components/HostPreGameView.tsx'),
      'utf-8'
    );
  });

  it('chat container does not use fixed h-72', () => {
    // h-72 is too tall on small phones (288px = 43% of iPhone SE height)
    // Should use a responsive height like h-48 sm:h-64
    expect(source).not.toContain('"bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72"');
  });

  it('uses roomChat translation key for chat section heading', () => {
    // "Battle Feed" is confusing jargon — should use hostView.roomChat
    expect(source).not.toContain("t('hostView.battleFeed')");
    expect(source).toContain("t('hostView.roomChat')");
  });

  it('TV Mode toggle appears outside the advanced settings accordion', () => {
    // TV Mode should be visible without expanding "Advanced Settings"
    // Check that broadcastMode checkbox appears before the showAdvanced conditional block
    const broadcastIdx = source.indexOf('broadcastMode');
    const advancedIdx = source.indexOf('showAdvanced &&');
    // broadcastModeTitle must appear BEFORE or AT the same level as advanced accordion
    expect(broadcastIdx).toBeLessThan(advancedIdx);
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="HostPreGameView.ux-improvements" --no-coverage
```

Expected: FAIL

### Step 3: Implement the fixes in HostPreGameView.tsx

**Change 1 — Chat container height (in `renderLobbyContent`, line 454):**

Old:
```tsx
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72">
```

New:
```tsx
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-48 sm:h-64">
```

**Change 2 — "Battle Feed" heading in renderLobbyContent (line 451-453):**

Old:
```tsx
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
          {t('hostView.battleFeed') || 'Battle Feed'}
        </h3>
```

New:
```tsx
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
          {t('hostView.roomChat') || 'Room Chat'}
        </h3>
```

**Change 3 — Move TV Mode out of Advanced Settings in `renderBattleModeCard`:**

Current structure in renderBattleModeCard (around line 374-421):
```tsx
      {/* Advanced Settings Toggle */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} ...>
        Advanced Settings
      </button>
    </div>  {/* end cream card */}

    {/* Advanced settings dropdown (outside cream card) */}
    <AnimatePresence>
      {showAdvanced && (
        <m.div ...>
          {/* TV Mode Toggle */}
          <div className="flex items-center gap-2 p-2 bg-neo-navy/40 ...">
            <Monitor ... />
            <Checkbox id="broadcastMode" ... />
            <label ...>TV/Projector Mode</label>
          </div>
          <BotControls ... />
        </m.div>
      )}
    </AnimatePresence>
```

New structure — TV Mode moves BEFORE the Advanced Settings accordion, directly inside the cream card before the Advanced Settings button:

Inside the cream card (just before the Advanced Settings toggle button), add the TV Mode row:

```tsx
        {/* TV Mode Toggle - visible by default (not hidden in accordion) */}
        <div className="mt-3 pt-3 border-t border-neo-black/10 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-neo-cream/80 flex-shrink-0" />
          <Checkbox
            id="broadcastMode"
            checked={!hostPlaying}
            onCheckedChange={(checked) => setHostPlaying(checked !== true)}
          />
          <label
            htmlFor="broadcastMode"
            className="text-xs font-bold uppercase text-neo-black cursor-pointer flex-1"
          >
            {t('hostView.broadcastModeTitle') || 'TV Mode'}
          </label>
        </div>

        {/* Advanced Settings Toggle - now only for BotControls */}
        <button ... >
          {t('common.advancedSettings') || 'Advanced Settings'}
        </button>
```

And inside the `showAdvanced` block, remove the TV Mode toggle (keep only BotControls):

```tsx
    <AnimatePresence>
      {showAdvanced && (
        <m.div ...>
          {/* Bot Controls only */}
          <BotControls
            socket={socket}
            gameCode={gameCode}
            players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
            disabled={false}
          />
        </m.div>
      )}
    </AnimatePresence>
```

**Change 4 — Add "you" ring to host in renderPlayerRoster (around line 243):**

Current map code:
```tsx
              {filteredPlayersForDisplay.map((player, index) => {
                const name = typeof player === 'string' ? player : player.username;
                const avatar = typeof player === 'object' ? player.avatar : null;
                const isHostPlayer = typeof player === 'object' ? player.isHost : false;
                const isBot = typeof player === 'object' ? player.isBot : false;
```

Add `isMe` after `isBot`:
```tsx
                const isMe = name === username;
```

Then in the avatar div (around line 280-283), add the ring class:

Old:
```tsx
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                    avatarColors[index % avatarColors.length]
                  )}>
```

New:
```tsx
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                    avatarColors[index % avatarColors.length],
                    isMe ? 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : ''
                  )}>
```

**Note on desktop chat (DesktopLobbyLayout rightContent):** The desktop chat at line 565-576 uses `flex-1 min-h-0` which is already good. No change needed there.

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="HostPreGameView.ux-improvements" --no-coverage
```

Expected: PASS

### Step 5: Run all HostPreGameView tests

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="HostPreGameView" --no-coverage
```

Expected: All PASS (including existing presetDrawer and tvTutorialMount tests)

### Step 6: Commit

```bash
cd fe-next && git add host/components/HostPreGameView.tsx __tests__/HostPreGameView.ux-improvements.test.tsx
git commit -m "fix(ux): fix chat height, host 'you' ring, TV Mode visibility in pre-game lobby"
```

---

## Task 4: Fix PlayerInGameView — h-dvh Layout

**Files:**
- Modify: `fe-next/player/components/PlayerInGameView.tsx` lines 191, 206
- Test (new): `fe-next/__tests__/components/PlayerInGameView.layout.test.tsx`

### Step 1: Write the failing test

Create `fe-next/__tests__/components/PlayerInGameView.layout.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 * Tests: PlayerInGameView must not use h-dvh (parent already constrains height)
 */
import fs from 'fs';
import path from 'path';

describe('PlayerInGameView layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../player/components/PlayerInGameView.tsx'),
      'utf-8'
    );
  });

  it('main game div uses flex-1 instead of h-dvh', () => {
    expect(source).not.toContain('"h-dvh overflow-hidden bg-neo-cream');
    expect(source).toContain('flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-cream');
  });

  it('loading placeholder does not use min-h-dvh', () => {
    expect(source).not.toContain('"min-h-dvh bg-neo-cream');
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-cream');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerInGameView.layout" --no-coverage
```

Expected: FAIL

### Step 3: Implement the fix in PlayerInGameView.tsx

**Change 1 — Loading placeholder (line 191):**

Old:
```tsx
      <div className="min-h-dvh bg-neo-cream dark:bg-neo-navy p-4 flex items-center justify-center">
```

New:
```tsx
      <div className="flex-1 flex flex-col min-h-0 bg-neo-cream dark:bg-neo-navy p-4 items-center justify-center">
```

**Change 2 — Main game container (line 206):**

Old:
```tsx
    <div className="h-dvh overflow-hidden bg-neo-cream dark:bg-neo-navy p-0 md:p-4 flex flex-col transition-colors duration-300">
```

New:
```tsx
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-cream dark:bg-neo-navy p-0 md:p-4 transition-colors duration-300">
```

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerInGameView.layout" --no-coverage
```

Expected: PASS

### Step 5: Commit

```bash
cd fe-next && git add player/components/PlayerInGameView.tsx __tests__/components/PlayerInGameView.layout.test.tsx
git commit -m "fix(ux): replace h-dvh with flex-1 in PlayerInGameView"
```

---

## Task 5: Fix ResultsPage — min-h-dvh Layout

**Files:**
- Modify: `fe-next/components/views/ResultsPage.tsx` line 380
- Test (new): `fe-next/__tests__/components/ResultsPage.layout.test.tsx`

### Step 1: Write the failing test

Create `fe-next/__tests__/components/ResultsPage.layout.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 * Tests: ResultsPage root div must not use min-h-dvh (parent constrains height)
 */
import fs from 'fs';
import path from 'path';

describe('ResultsPage layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../components/views/ResultsPage.tsx'),
      'utf-8'
    );
  });

  it('root div uses flex-1 min-h-0 instead of min-h-dvh', () => {
    expect(source).not.toContain('"min-h-dvh flex flex-col bg-neo-navy');
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-navy');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="ResultsPage.layout" --no-coverage
```

Expected: FAIL

### Step 3: Implement the fix in ResultsPage.tsx

Find line 380 (the root div of the main return):

Old:
```tsx
      <div className="min-h-dvh flex flex-col bg-neo-navy transition-colors duration-300 relative">
```

New:
```tsx
      <div className="flex-1 flex flex-col min-h-0 bg-neo-navy transition-colors duration-300 relative">
```

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="ResultsPage.layout" --no-coverage
```

Expected: PASS

### Step 5: Verify existing ResultsPage tests still pass

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="ResultsPage" --no-coverage
```

Expected: All PASS (bottomSafeZone test checks for `pb-[--mobile-bottom-safe]` and `fixed bottom-0` which are unchanged)

### Step 6: Commit

```bash
cd fe-next && git add components/views/ResultsPage.tsx __tests__/components/ResultsPage.layout.test.tsx
git commit -m "fix(ux): replace min-h-dvh with flex-1 in ResultsPage"
```

---

## Task 6: Add Translations — hostView.roomChat

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`

### Step 1: Write the failing test

Create `fe-next/__tests__/multiplayer-ux-translations.test.ts`:

```ts
/**
 * Tests that all required UX translation keys exist in all 4 languages.
 */
import en from '../translations/en';
import he from '../translations/he';
import sv from '../translations/sv';
import ja from '../translations/ja';

type Translations = Record<string, Record<string, string>>;

describe('Multiplayer UX translation keys', () => {
  const langs = { en, he, sv, ja } as Record<string, Translations>;

  it.each(Object.entries(langs))('%s: has hostView.roomChat key', (name, t) => {
    expect(t.hostView?.roomChat).toBeDefined();
    expect(typeof t.hostView.roomChat).toBe('string');
    expect(t.hostView.roomChat.length).toBeGreaterThan(0);
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="multiplayer-ux-translations" --no-coverage
```

Expected: FAIL — `hostView.roomChat` undefined

### Step 3: Add the translation keys

In `fe-next/translations/en.js`, find the `hostView` section and add after `"battleFeed"`:
```js
      "roomChat": "Room Chat",
```

In `fe-next/translations/he.js`, add:
```js
      "roomChat": "צ'אט חדר",
```

In `fe-next/translations/sv.js`, add:
```js
      "roomChat": "Rumschatt",
```

In `fe-next/translations/ja.js`, add:
```js
      "roomChat": "ルームチャット",
```

**How to find the right location:** In each file, search for `"battleFeed"` and add `"roomChat"` on the line after it.

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="multiplayer-ux-translations" --no-coverage
```

Expected: PASS (4 language tests pass)

### Step 5: Run translations import test to verify no breakage

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="translations" --no-coverage
```

Expected: All PASS

### Step 6: Commit

```bash
cd fe-next && git add translations/en.js translations/he.js translations/sv.js translations/ja.js __tests__/multiplayer-ux-translations.test.ts
git commit -m "feat(i18n): add hostView.roomChat translation key for all 4 languages"
```

---

## Task 7: Also fix PlayerWaitingView chat height (mirrors HostPreGameView)

**Files:**
- Modify: `fe-next/player/components/PlayerWaitingView.tsx` line 176

### Step 1: Update existing test

In `fe-next/__tests__/components/PlayerWaitingView.layout.test.tsx`, add:

```tsx
  it('chat container does not use fixed h-72', () => {
    expect(source).not.toContain('"bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72"');
  });
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerWaitingView.layout" --no-coverage
```

Expected: FAIL

### Step 3: Fix the chat height in PlayerWaitingView.tsx

Find line 176:

Old:
```tsx
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72">
```

New:
```tsx
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-48 sm:h-64">
```

Also rename "Battle Feed" to "Room Chat" in PlayerWaitingView (line 173):

Old:
```tsx
          {t('hostView.battleFeed') || 'Battle Feed'}
```

New:
```tsx
          {t('hostView.roomChat') || 'Room Chat'}
```

### Step 4: Run test to verify it passes

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="PlayerWaitingView.layout" --no-coverage
```

Expected: PASS

### Step 5: Commit

```bash
cd fe-next && git add player/components/PlayerWaitingView.tsx __tests__/components/PlayerWaitingView.layout.test.tsx
git commit -m "fix(ux): fix chat height and rename Battle Feed to Room Chat in player waiting view"
```

---

## Task 8: Final Validation

### Step 1: Run full test suite

```bash
cd fe-next && npm run lint && npm run test:frontend --no-coverage && npm run build
```

Expected: lint clean, all tests pass, build succeeds.

### Step 2: Manual smoke test checklist

- [ ] Navigate to `/multiplayer` — lobby loads, no double scrollbar
- [ ] Lobby: Active Battles section visible without scrolling on mobile viewport
- [ ] Lobby: "Friend Activity" heading does NOT appear
- [ ] Create a room — pre-game host lobby loads
- [ ] Host lobby: own avatar has green ring around it
- [ ] Host lobby: chat is shorter on small screens (h-48 vs h-72)
- [ ] Host lobby: "TV Mode" checkbox visible WITHOUT clicking "Advanced Settings"
- [ ] Host lobby: chat section heading says "Room Chat" not "Battle Feed"
- [ ] Join a room as player — waiting view loads without overflow
- [ ] Start game — player in-game view loads without overflow
- [ ] Game ends — results page loads without overflow
- [ ] Test Hebrew: `/multiplayer?locale=he` — RTL renders correctly

### Step 3: Commit final doc

```bash
cd fe-next && git add docs/plans/2026-02-21-multiplayer-ux-impl.md docs/plans/2026-02-21-multiplayer-ux-design.md
git commit -m "docs: add multiplayer UX overhaul design and implementation plan"
```
