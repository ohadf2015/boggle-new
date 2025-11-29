# LexiClash - Bug Report & Fixes

**Date:** November 29, 2025
**Priority:** Critical bugs listed first

---

## CRITICAL BUGS (Fix Immediately)

### 1. Missing Translation Keys in Swedish and Japanese

**Severity:** Critical
**File:** `/fe-next/translations/index.js`
**Lines:** N/A

**Description:**
Translation key mismatch detected:
- Hebrew (he): 26 top-level keys ✓
- English (en): 26 top-level keys ✓
- Swedish (sv): 25 top-level keys ⚠️ (1 missing)
- Japanese (ja): 25 top-level keys ⚠️ (1 missing)

**Impact:**
- Application may crash or show undefined/missing text when using Swedish or Japanese
- Poor user experience for non-English/Hebrew users
- Breaks promise of full internationalization support

**Steps to Reproduce:**
```bash
cd fe-next
node -e "const trans = require('./translations/index.js').translations; console.log('Hebrew keys:', Object.keys(trans.he).length); console.log('English keys:', Object.keys(trans.en).length); console.log('Swedish keys:', Object.keys(trans.sv).length); console.log('Japanese keys:', Object.keys(trans.ja).length);"
```

**How to Fix:**
1. Compare top-level keys between languages:
```javascript
const he_keys = Object.keys(translations.he);
const sv_keys = Object.keys(translations.sv);
const ja_keys = Object.keys(translations.ja);

const missing_sv = he_keys.filter(k => !sv_keys.includes(k));
const missing_ja = he_keys.filter(k => !ja_keys.includes(k));

console.log('Swedish missing:', missing_sv);
console.log('Japanese missing:', missing_ja);
```

2. Add the missing key(s) to both `translations.sv` and `translations.ja`
3. Test by switching to Swedish/Japanese in the UI
4. Verify no "undefined" or missing text appears

**Recommended Fix Location:**
File: `/fe-next/translations/index.js` (around line 1-1140)

---

## MAJOR BUGS (Fix Soon)

### 2. HostView Component Too Large (1,112 lines)

**Severity:** Major (Maintainability)
**File:** `/fe-next/host/HostView.jsx`
**Lines:** 1-1112

**Description:**
HostView component violates single responsibility principle with 1,112 lines of code handling:
- Lobby management
- Game settings
- Gameplay view
- Word validation
- Multiple socket events
- State management

**Impact:**
- Difficult to maintain and debug
- Hard to test individual features
- Merge conflicts likely
- Performance issues (large component re-renders)
- Onboarding new developers is harder

**How to Fix:**
Refactor into smaller components:

```
host/
  ├── HostView.jsx (Main container, 200-300 lines)
  ├── components/
  │   ├── HostLobby.jsx (Player management, accept/reject)
  │   ├── HostGameSettings.jsx (Difficulty, timer, language)
  │   ├── HostGamePlay.jsx (Active game view)
  │   └── HostValidation.jsx (Word review phase)
  └── hooks/
      ├── useHostSocket.js (Socket event handlers)
      └── useHostState.js (State management)
```

**Example Refactor:**
```jsx
// HostView.jsx (Main container)
import HostLobby from './components/HostLobby';
import HostGameSettings from './components/HostGameSettings';
import HostGamePlay from './components/HostGamePlay';
import HostValidation from './components/HostValidation';
import { useHostSocket } from './hooks/useHostSocket';
import { useHostState } from './hooks/useHostState';

export default function HostView({ gameCode, roomLanguage, initialPlayers, username, onShowResults }) {
  const { state, actions } = useHostState(initialPlayers);
  const { socketHandlers } = useHostSocket(gameCode, actions);

  // Render appropriate view based on game state
  if (state.gamePhase === 'lobby') {
    return <HostLobby {...props} />;
  } else if (state.gamePhase === 'playing') {
    return <HostGamePlay {...props} />;
  } else if (state.gamePhase === 'validating') {
    return <HostValidation {...props} />;
  }
}
```

---

### 3. PlayerView Component Too Large (909 lines)

**Severity:** Major (Maintainability)
**File:** `/fe-next/player/PlayerView.jsx`
**Lines:** 1-909

**Description:**
Similar to HostView, PlayerView is too large and handles too many responsibilities.

**How to Fix:**
Refactor into:

```
player/
  ├── PlayerView.jsx (Main container, 200-300 lines)
  ├── components/
  │   ├── PlayerGameGrid.jsx (Grid interaction)
  │   ├── PlayerWordList.jsx (Found words list)
  │   └── PlayerScoreboard.jsx (Leaderboard display)
  └── hooks/
      ├── usePlayerSocket.js (Socket events)
      └── usePlayerState.js (State management)
```

---

### 4. Responsive Design Not Tested on Real Devices

**Severity:** Major
**Files:** All component files
**Lines:** N/A

**Description:**
While responsive Tailwind classes are used throughout, the application has not been tested on actual mobile devices.

**Impact:**
- May have layout issues on specific screen sizes
- Touch targets may be too small
- Text may overflow on narrow screens
- Grid may not be usable on small screens

**How to Fix:**
1. Test on real devices:
   - iPhone 12/13/14 (390px width)
   - iPhone SE (375px width)
   - Android phones (360px, 412px)
   - iPad (768px, 1024px)
   - Small tablets (600-768px)

2. Use browser DevTools responsive mode to simulate:
```javascript
// Test these viewport sizes
const testSizes = [
  { width: 320, height: 568 }, // iPhone SE (old)
  { width: 375, height: 667 }, // iPhone 6/7/8
  { width: 390, height: 844 }, // iPhone 12/13
  { width: 360, height: 640 }, // Small Android
  { width: 412, height: 915 }, // Large Android
  { width: 768, height: 1024 }, // iPad portrait
  { width: 1024, height: 768 }, // iPad landscape
];
```

3. Fix any issues found:
   - Adjust breakpoints in `tailwind.config.js`
   - Add mobile-specific layouts
   - Ensure touch targets >= 44x44px
   - Test grid usability on small screens

**Testing Checklist:**
- [ ] Join flow works on mobile
- [ ] Grid is usable with touch
- [ ] Buttons are tappable (44px minimum)
- [ ] Text is readable (no tiny font sizes)
- [ ] Modals/dialogs fit on screen
- [ ] No horizontal scrolling
- [ ] Keyboard doesn't cover inputs
- [ ] Landscape mode works

---

## MINOR BUGS (Fix When Possible)

### 5. Auto-Join Uses Unreliable setTimeout

**Severity:** Minor
**File:** `/fe-next/JoinView.jsx`
**Lines:** 143-148

**Description:**
Auto-join when clicking a room uses arbitrary 100ms setTimeout which could fail on slow connections.

**Current Code:**
```jsx
setTimeout(() => {
  handleJoin(false);
}, 100);
```

**How to Fix:**
Use proper state synchronization:
```jsx
// Instead of setTimeout, use useEffect
useEffect(() => {
  if (gameCode && username && shouldAutoJoin && socket?.connected) {
    handleJoin(false);
    setShouldAutoJoin(false);
  }
}, [gameCode, username, shouldAutoJoin, socket?.connected]);
```

---

### 6. Excessive Console Logging (409 instances)

**Severity:** Minor (Performance)
**Files:** 34 files across the codebase
**Lines:** Multiple

**Description:**
409 console.log/warn/error statements found across 34 files, which:
- Impacts performance
- Clutters browser console
- May leak sensitive information
- Should use proper logging in production

**How to Fix:**
1. Use the existing logger utility at `/fe-next/utils/logger.js`:
```jsx
// Replace this:
console.log('[SOCKET.IO] Connected:', socket.id);

// With this:
import logger from '@/utils/logger';
logger.log('[SOCKET.IO] Connected:', socket.id);
```

2. Configure log levels by environment:
```javascript
// utils/logger.js
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'debug';
```

3. Add log levels to existing logger:
```javascript
export const logger = {
  debug: (...args) => LOG_LEVEL >= 4 && console.debug(...args),
  info: (...args) => LOG_LEVEL >= 3 && console.info(...args),
  warn: (...args) => LOG_LEVEL >= 2 && console.warn(...args),
  error: (...args) => LOG_LEVEL >= 1 && console.error(...args),
};
```

**Files to Update:**
- `/fe-next/app/[locale]/page.jsx` (20 instances)
- `/fe-next/backend/socketHandlers.js` (44 instances)
- `/fe-next/server.js` (20 instances)
- And 31 other files...

---

### 7. Rooms Loading Fallback Timeout

**Severity:** Minor
**File:** `/fe-next/app/[locale]/page.jsx`
**Lines:** 67, 365-368

**Description:**
Rooms loading state uses 5-second timeout fallback which may show stale/incorrect data.

**Current Code:**
```jsx
const roomsLoadingTimeout = setTimeout(() => {
  setRoomsLoading(false);
}, 5000);
```

**How to Fix:**
Add explicit error state:
```jsx
const [roomsError, setRoomsError] = useState(false);

socket.on('activeRoomsError', (error) => {
  setRoomsError(error);
  setRoomsLoading(false);
});

// In UI:
{roomsError && (
  <Alert variant="destructive">
    <AlertDescription>
      {t('errors.roomsLoadFailed')}
      <Button onClick={refreshRooms}>Retry</Button>
    </AlertDescription>
  </Alert>
)}
```

---

### 8. No Browser Language Auto-Detection

**Severity:** Minor (UX)
**File:** `/fe-next/contexts/LanguageContext.jsx`
**Lines:** ~1-50 (initialization)

**Description:**
Application doesn't detect browser language on first visit, always defaults to Hebrew.

**How to Fix:**
Add browser language detection:
```jsx
const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'he';

  const browserLang = navigator.language.split('-')[0]; // e.g., 'en-US' -> 'en'
  const supportedLangs = ['he', 'en', 'sv', 'ja'];

  return supportedLangs.includes(browserLang) ? browserLang : 'he';
};

// In LanguageContext initialization:
const [language, setLanguage] = useState(() => {
  if (typeof window === 'undefined') return 'he';
  const saved = localStorage.getItem('language');
  return saved || getBrowserLanguage();
});
```

---

### 9. Room Name Validation Allows Confusing Special Characters

**Severity:** Minor (UX)
**File:** `/fe-next/utils/validation.js`
**Lines:** 55

**Description:**
Validation allows `._-` which may not be clear in all languages/fonts.

**Current Code:**
```javascript
const validPattern = /^[a-zA-Z0-9\s\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u024F._-]+$/;
```

**How to Fix:**
Restrict to alphanumeric + spaces only:
```javascript
const validPattern = /^[a-zA-Z0-9\s\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u024F]+$/;
```

Or add clear UI guidance:
```jsx
<Label htmlFor="roomName">
  {t('joinView.roomName')}
  <span className="text-xs text-gray-500">
    ({t('joinView.roomNameHelp')}) {/* "Letters, numbers, and spaces only" */}
  </span>
</Label>
```

---

### 10. Chat Sound Error Handling

**Severity:** Minor
**File:** `/fe-next/components/RoomChat.jsx`
**Lines:** 56

**Description:**
Notification sound error only logged to console, no user feedback or preferences.

**Current Code:**
```jsx
notificationSoundRef.current.play().catch(err => console.log('Sound play failed:', err));
```

**How to Fix:**
Add user preference and better error handling:
```jsx
const [soundEnabled, setSoundEnabled] = useState(() => {
  return localStorage.getItem('chatSoundsEnabled') !== 'false';
});

const playNotificationSound = () => {
  if (!soundEnabled || !notificationSoundRef.current) return;

  notificationSoundRef.current.play().catch(err => {
    logger.warn('[Chat] Sound playback failed:', err);
    // Optionally disable sounds if they keep failing
    if (err.name === 'NotAllowedError') {
      toast.error(t('chat.soundsBlocked'));
    }
  });
};

// Add toggle in chat UI
<Button onClick={() => {
  const newValue = !soundEnabled;
  setSoundEnabled(newValue);
  localStorage.setItem('chatSoundsEnabled', newValue);
}}>
  {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
</Button>
```

---

### 11. Virtual Scrolling Height Estimation

**Severity:** Minor (UX)
**File:** `/fe-next/components/RoomChat.jsx`
**Lines:** 14

**Description:**
Estimated message height (60px) may not match actual for long messages, causing scroll position issues.

**Current Code:**
```jsx
const ESTIMATED_MESSAGE_HEIGHT = 60;
```

**How to Fix:**
Use dynamic height or increase estimate:
```jsx
const ESTIMATED_MESSAGE_HEIGHT = 80; // Increase buffer

// Or use dynamic sizing:
estimateSize: (index) => {
  const message = messages[index];
  const baseHeight = 60;
  const charLength = message?.message?.length || 0;
  // Add extra height for longer messages
  return baseHeight + Math.min(charLength / 50 * 10, 40);
}
```

---

### 12. Client-Side Path Finding Duplicates Server Logic

**Severity:** Minor (Maintainability)
**File:** `/fe-next/ResultsPage.jsx`
**Lines:** 19-60

**Description:**
Client duplicates server's word path finding algorithm, risking drift if algorithms change.

**How to Fix:**
Include word paths in server response:
```javascript
// Server-side (backend/socketHandlers.js):
socket.emit('scores', {
  scores: finalScores.map(player => ({
    ...player,
    words: player.words.map(word => ({
      word: word.word,
      isValid: word.isValid,
      path: getWordPath(word.word, letterGrid) // Add path from server
    }))
  })),
  letterGrid
});

// Client-side (ResultsPage.jsx):
// Remove getWordPath function and searchWordPath
// Use paths from server data directly
```

---

### 13. Touch Deadzone Not Documented

**Severity:** Minor (Documentation)
**File:** `/fe-next/components/GridComponent.jsx`
**Lines:** 4

**Description:**
Touch deadzone threshold is imported but not explained.

**How to Fix:**
Add comments:
```jsx
import { getDeadzoneThreshold } from '../utils/consts';

/**
 * Deadzone threshold prevents accidental cell selection during scrolling.
 * Value represents minimum pixel distance before treating as intentional drag.
 *
 * Default: 10px on desktop, 15px on mobile
 * Adjust in utils/consts.js if touch selection feels too sensitive/insensitive
 */
const deadzoneThreshold = getDeadzoneThreshold();
```

---

## ENHANCEMENT SUGGESTIONS

### 14. Add Skip-to-Content Link

**Severity:** Enhancement (Accessibility)
**File:** Create new component
**Lines:** N/A

**Description:**
Keyboard users must tab through header to reach main content.

**How to Fix:**
```jsx
// components/SkipToContent.jsx
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-neo-yellow focus:text-neo-black focus:rounded-neo"
    >
      {t('a11y.skipToContent')}
    </a>
  );
}

// app/layout.jsx
<body>
  <SkipToContent />
  <Header />
  <main id="main-content" tabIndex={-1}>
    {children}
  </main>
</body>
```

---

### 15. Add Error Boundary

**Severity:** Enhancement (Stability)
**File:** Create new component
**Lines:** N/A

**Description:**
No error boundary to catch React crashes.

**How to Fix:**
```jsx
// components/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
    // Log to error tracking service (e.g., LogRocket, Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card>
            <CardHeader>
              <CardTitle>Oops! Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t('errors.somethingWentWrong')}</p>
              <Button onClick={() => window.location.reload()}>
                {t('common.reload')}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// app/layout.jsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

---

## Testing Recommendations

### Add Automated Tests

**Unit Tests (Jest + React Testing Library)**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**E2E Tests (Playwright)**
```bash
npm install --save-dev @playwright/test
```

**Example Test:**
```javascript
// __tests__/JoinView.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import JoinView from '@/JoinView';

describe('JoinView', () => {
  it('validates username length', () => {
    render(<JoinView {...props} />);

    const input = screen.getByLabelText(/username/i);
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.submit(screen.getByRole('form'));

    expect(screen.getByText(/too short/i)).toBeInTheDocument();
  });
});
```

---

## Summary

**Total Bugs Found:** 13
- Critical: 1 (Missing translation keys)
- Major: 3 (Large components, untested responsive)
- Minor: 9 (Various UX/maintainability issues)

**Total Enhancements:** 2+ suggested

**Priority Order:**
1. ✅ Fix missing translation keys (CRITICAL)
2. ⚠️ Test responsive design on real devices
3. ⚠️ Replace console.log with logger
4. ⚠️ Refactor large components
5. All other minor bugs and enhancements

---

**Last Updated:** November 29, 2025
**Report By:** Claude Code Comprehensive Testing
