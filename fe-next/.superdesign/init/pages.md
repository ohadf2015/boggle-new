# LexiClash Key Pages - Component Dependency Trees

## Overview
Component dependency trees for the 5 most important pages in the application.
Each tree shows imports and sub-components used by the page.

---

## 1. Landing Page
**Route:** `/[locale]`
**Files:** `app/[locale]/page.tsx` -> `app/[locale]/PageClient.tsx` -> `components/landing/LandingView.tsx`

### Dependency Tree
```
app/[locale]/page.tsx
  └── PageClient.tsx (HomePageClient)
        └── LandingView.tsx (~500 lines)
              ├── Header
              ├── ModeCard (game mode cards)
              ├── ModeCardV2 (enhanced mode cards)
              ├── LandingShareBanner
              ├── IdleMascotWithEntrance (components/ui/IdleMascot)
              ├── PullToRefreshIndicator (components/ui/PullToRefreshIndicator)
              ├── HeroMascot (inline memo component)
              ├── AuthModal (lazy loaded)
              ├── ShareReferralModal (lazy loaded)
              │
              ├── Hooks:
              │   ├── useLanguage (contexts/LanguageContext)
              │   ├── useMusic (contexts/MusicContext)
              │   ├── useAuth (contexts/AuthContext)
              │   ├── useMobileLandscape
              │   ├── useMobilePortrait
              │   ├── useLiveRoomStats
              │   ├── usePullToRefresh
              │   ├── useMouseParallax (hooks/useTiltEffect)
              │   ├── usePlayerStats
              │   └── useDailyChallengeStatus
              │
              ├── Utils:
              │   ├── cn (lib/utils)
              │   ├── hasCompletedOnboarding (utils/onboardingStorage)
              │   ├── markOnboardingSkipped (utils/onboardingStorage)
              │   └── getPerfVariant (utils/perfVariant)
              │
              └── Icons (lucide-react):
                  User, Users, Bot, Trophy, LayoutGrid, Crown,
                  GraduationCap, Map, Sparkles, Bomb
```

### Key Patterns
- Performance-adaptive: `getPerfVariant()` controls animation complexity
- Lazy-loaded modals: AuthModal, ShareReferralModal (not needed at mount)
- Pull-to-refresh: refreshes live room stats
- Responsive: separate layouts for mobile portrait, landscape, desktop

---

## 2. Daily Challenge Page
**Route:** `/[locale]/daily`
**Files:** `app/[locale]/daily/page.tsx` -> `components/daily/DailyChallengeRouter.tsx`

### Dependency Tree
```
app/[locale]/daily/page.tsx (283 lines)
  ├── SEO: Dynamic OG metadata for sharing (emoji grid results)
  └── DailyChallengeRouter.tsx
        ├── DailyChallengeLanding (if already played today)
        ├── BuzzHistoryList (modal overlay)
        ├── Header
        ├── PageLoader (loading state)
        │
        ├── Hooks:
        │   ├── useLanguage
        │   └── useRouter (next/navigation)
        │
        └── Utils:
            └── getWordHuntStatusToday (utils/dailyChallenge/storage)
```

### Smart Routing Logic
- If user has NOT played today -> redirects to `/[locale]/daily/word-hunt`
- If user HAS played today -> shows DailyChallengeLanding with results

---

## 3. Daily Challenge Landing
**Route:** `/[locale]/daily` (when already played)
**File:** `components/daily/DailyChallengeLanding.tsx` (539 lines)

### Dependency Tree
```
DailyChallengeLanding.tsx
  ├── ScoreGauntletBanner
  ├── DailyMissionsHeader (./landing/DailyMissionsHeader)
  ├── QuestCard (./landing/QuestCard)
  ├── StreakCounter (./landing/StreakCounter)
  ├── LeaderboardTeaser (./landing/LeaderboardTeaser)
  ├── ConfettiBackground (./landing/ConfettiBackground)
  ├── FloatingDecorations (./landing/FloatingDecorations)
  │
  ├── Hooks:
  │   ├── useLanguage
  │   ├── useAuth
  │   ├── usePathname (next/navigation)
  │   └── useSearchParams (next/navigation)
  │
  ├── Utils:
  │   ├── cn (lib/utils)
  │   ├── getWordHuntStatusToday (utils/dailyChallenge/storage)
  │   └── getGuestFingerprint (utils/guestManager)
  │
  └── Icons (lucide-react):
      Timer, Hourglass, Trophy, Check, X, Eye
```

### Layout Pattern
- Arcade quest vertical path with XP header
- Quest cards for Word Hunt and Daily Buzz
- Streak counter with confetti celebration
- Leaderboard teaser at bottom

---

## 4. Daily Word Hunt Game (DailyChallenge)
**Route:** `/[locale]/daily/word-hunt`
**File:** `components/daily/DailyChallenge.tsx` (814 lines)

### Dependency Tree
```
DailyChallenge.tsx
  ├── DailyWordHuntSurvival (game board + survival mechanics)
  │   ├── WordFormingArea
  │   ├── SurvivalDesktopLayout
  │   └── Guidance hooks
  │
  ├── DailyWordHuntResults (results + sharing)
  │   ├── MobileTabBar (components/layout/MobileTabBar)
  │   ├── CoinSpendAnimation
  │   ├── TabbedDailyLeaderboard
  │   ├── WinCinematic
  │   └── StreakMilestoneCelebration
  │
  ├── DailyReadyScreen (pre-game lobby)
  │   ├── TabbedDailyLeaderboard
  │   ├── DailyIntroCarousel
  │   ├── CreateChallengeModal
  │   ├── AuthModal
  │   └── Mascot
  │
  ├── DailyChallengeTutorial
  ├── TrainingGatewayModal (components/training)
  ├── AutoHideHeader
  ├── PullToRefreshIndicator (components/ui/PullToRefreshIndicator)
  ├── PageLoader (components/ui/PageLoader)
  │
  ├── Hooks:
  │   ├── useAuth (contexts/AuthContext)
  │   ├── useLanguage (contexts/LanguageContext)
  │   ├── useMusic (contexts/MusicContext)
  │   ├── usePullToRefresh
  │   └── useSearchParams (next/navigation)
  │
  ├── Utils:
  │   ├── generateDailyPuzzle
  │   ├── getDailyChallengeDate
  │   ├── getPuzzleNumber
  │   ├── getSecondsUntilNextDaily
  │   ├── formatCountdown
  │   ├── hasPlayedWordHuntToday
  │   ├── getTodaysWordHuntResult
  │   ├── saveWordHuntResult
  │   ├── getDailyStreak
  │   ├── parseChallengeParam
  │   ├── clearWordHuntResultForRetry
  │   ├── getGuestFingerprint
  │   ├── mapServerResultToStoredResult
  │   ├── hasPlayedAnyGame (utils/playerProgressStorage)
  │   ├── shouldShowTrainingGateway (utils/trainingProgressStorage)
  │   ├── markGatewaySkipped
  │   └── markGatewaySeen
  │
  └── Types: LetterGrid, Language, SurvivalGameResult, ChallengeData, WordHuntResult
```

### Game Phases
```
loading -> ready -> tutorial? -> playing -> completed -> already-played
```
1. **Loading**: PageLoader while puzzle generates
2. **Ready**: DailyReadyScreen with leaderboard, carousel, challenge creation
3. **Tutorial**: Optional DailyChallengeTutorial (first-time only)
4. **Playing**: DailyWordHuntSurvival (10-attempt word finding)
5. **Completed**: DailyWordHuntResults with sharing, leaderboard, cinematics
6. **Already-Played**: Results view (re-visit same day)

---

## 5. DailyChallengeRouter
**Route:** `/[locale]/daily`
**File:** `components/daily/DailyChallengeRouter.tsx` (87 lines)

### Dependency Tree
```
DailyChallengeRouter.tsx
  ├── DailyChallengeLanding
  │   └── (see tree #3 above)
  ├── BuzzHistoryList (components/buzz/BuzzHistoryList)
  ├── Header
  ├── PageLoader (components/ui/PageLoader)
  │
  ├── Hooks:
  │   ├── useLanguage
  │   └── useRouter (next/navigation)
  │
  └── Utils:
      └── getWordHuntStatusToday (utils/dailyChallenge/storage)
```

### Full Source
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import BuzzHistoryList from '../buzz/BuzzHistoryList';
import Header from '../Header';
import { PageLoader } from '@/components/ui/PageLoader';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';

type RouterState = 'loading' | 'landing' | 'redirecting';

export default function DailyChallengeRouter() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [showBuzzHistory, setShowBuzzHistory] = useState(false);
  const [routerState, setRouterState] = useState<RouterState>('loading');

  useEffect(() => {
    const status = getWordHuntStatusToday(language as Language);
    if (status === null) {
      setRouterState('redirecting');
      router.replace(`/${language}/daily/word-hunt`);
    } else {
      setRouterState('landing');
    }
  }, [language, router]);

  if (routerState === 'loading' || routerState === 'redirecting') {
    return (
      <div className="flex-1 flex flex-col bg-neo-navy">
        <PageLoader size="lg" text={t('daily.loading')} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neo-navy">
      <Header />
      <DailyChallengeLanding
        onSelectWordHunt={() => router.push(`/${language}/daily/word-hunt`)}
        onSelectBuzz={() => router.push(`/${language}/daily/buzz`)}
        onShowBuzzHistory={() => setShowBuzzHistory(true)}
        currentLanguage={language as Language}
      />
      <AnimatePresence>
        {showBuzzHistory && (
          <BuzzHistoryList
            language={language as Language}
            onSelectDate={(date) => { setShowBuzzHistory(false); router.push(`/${language}/daily/buzz?date=${date}`); }}
            onClose={() => setShowBuzzHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Common Shared Dependencies

### UI Components (used across all pages)
- `PageLoader` - Full-page loading state with Mascot
- `Button` / `EnhancedButton` / `TactileButton` - Action buttons
- `Card` / `CardDark` / `CardVariant` - Content containers
- `Dialog` - Modal dialogs with header color variants
- `EmptyState` - No-data states with mascot
- `Badge` - Status/info labels
- `Skeleton` - Loading placeholders

### Layout Components
- `PageLayout` - Standard page wrapper with header + pull-to-refresh
- `SafeAreaLayout` - iOS safe area handling
- `GamePageWrapper` - Game screen wrapper with Capacitor safe areas
- `PageStateHandler` - Loading/error/empty state handler

### Context Providers
- `LanguageContext` (useLanguage) - i18n, RTL, locale
- `AuthContext` (useAuth) - User authentication state
- `MusicContext` (useMusic) - Background music control
- `NavigationContext` (useNavigation) - In-game state for nav hiding
- `ThemeContext` (useTheme) - Dark/light mode

### Common Hooks
- `usePullToRefresh` - Pull-to-refresh gesture handling
- `useSafeArea` - iOS safe area insets
- `useMobileLandscape` / `useMobilePortrait` - Orientation detection
- `usePlayerStats` - Player statistics
- `useDailyChallengeStatus` - Daily challenge completion state
