# LexiClash Quick Wins - Detailed Task Breakdown

**Project:** LexiClash Enhancement - Market Research Quick Wins (1-3 months)
**Tech Stack:** Next.js 16, React 19, TypeScript, Socket.IO, Supabase, Tailwind CSS
**Base Directory:** `/Users/ohadfisher/git/boggle-new/fe-next/`

---

## FEATURE 1: Victory Sharing Graphics with Auto-Generated Score Cards

### Phase 1.1: Score Card Data Structure & API

**Task 1.1.1: Define Score Card Data Types**
- **ID:** QW-1.1.1
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Create TypeScript interfaces for score card data in `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/scorecard.ts`
  - Include: username, score, rank, achievements, game stats (words found, longest word, combo max)
  - Include metadata: game code, timestamp, language
  - Add translation keys for score card labels
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/scorecard.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/view.ts` (extend existing types)

**Task 1.1.2: Backend Score Card Generation Endpoint**
- **ID:** QW-1.1.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-1.1.1
- **Acceptance Criteria:**
  - Create API endpoint to generate score card data from game results
  - Aggregate player stats: rank, percentile, achievements unlocked
  - Return structured data for frontend rendering
  - Add rate limiting (max 10 requests/minute per user)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/ScoreCardHandler.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/index.ts` (register handler)
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/socket.ts` (add socket events)

### Phase 1.2: Frontend Score Card Component

**Task 1.2.1: Create Base Score Card Component**
- **ID:** QW-1.2.1
- **Estimated Time:** 3 hours
- **Dependencies:** QW-1.1.1
- **Acceptance Criteria:**
  - Create responsive score card component with neo-brutalist styling
  - Display: player name, avatar, rank badge, total score, key stats
  - Use Tailwind classes: `shadow-hard`, `border-neo`, `rounded-neo`
  - Support RTL layout for Hebrew
  - Add accessibility: ARIA labels, keyboard navigation
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCard.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCardStats.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts` (add scorecard translations)

**Task 1.2.2: Add Dynamic Background Patterns**
- **ID:** QW-1.2.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-1.2.1
- **Acceptance Criteria:**
  - Generate unique background patterns based on player rank (1st, 2nd, 3rd, other)
  - Use CSS gradients and halftone texture overlays
  - Add animated confetti for 1st place winners
  - Ensure good contrast for text readability
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCard.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCardBackground.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/globals.css` (add pattern styles)

### Phase 1.3: Canvas-Based Image Generation

**Task 1.3.1: Install and Configure HTML-to-Canvas Library**
- **ID:** QW-1.3.1
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Install `html-to-image` package (lightweight alternative to html2canvas)
  - Configure for Next.js client-side rendering
  - Add TypeScript type definitions
  - Test basic canvas generation
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/package.json`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/lib/canvas-utils.ts`

**Task 1.3.2: Implement Score Card to Image Conversion**
- **ID:** QW-1.3.2
- **Estimated Time:** 3 hours
- **Dependencies:** QW-1.3.1, QW-1.2.1
- **Acceptance Criteria:**
  - Create hook `useScoreCardImage()` for image generation
  - Generate high-res PNG (1200x630px for social sharing)
  - Handle loading states and error handling
  - Add retry logic for failed generations
  - Optimize for mobile performance
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useScoreCardImage.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCard.tsx`

### Phase 1.4: Sharing Functionality

**Task 1.4.1: Create Share Button Component**
- **ID:** QW-1.4.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-1.3.2
- **Acceptance Criteria:**
  - Share button with neo-brutalist styling
  - Show loading spinner during image generation
  - Display success/error feedback with toast notifications
  - Keyboard accessible (Enter/Space to activate)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ShareButton.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 1.4.2: Implement Web Share API with Fallbacks**
- **ID:** QW-1.4.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-1.4.1
- **Acceptance Criteria:**
  - Use native Web Share API when available
  - Fallback to download for desktop browsers
  - Copy image to clipboard as secondary fallback
  - Add share tracking analytics event
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useShare.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ShareButton.tsx`

**Task 1.4.3: Integrate Share Button into Results Page**
- **ID:** QW-1.4.3
- **Estimated Time:** 1 hour
- **Dependencies:** QW-1.4.2
- **Acceptance Criteria:**
  - Add share button to results page header
  - Position prominently with "Share Your Victory" CTA
  - Add subtle pulse animation to draw attention
  - Test on mobile and desktop
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/results/page.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/results/ResultsHeader.tsx` (if exists)

### Phase 1.5: Testing & Optimization

**Task 1.5.1: Add Unit Tests for Score Card**
- **ID:** QW-1.5.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-1.2.1, QW-1.3.2
- **Acceptance Criteria:**
  - Test score card rendering with various data
  - Test image generation success/failure paths
  - Test share functionality with mocked APIs
  - Achieve >80% code coverage
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/__tests__/components/scorecard/ScoreCard.test.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/__tests__/hooks/useScoreCardImage.test.ts`

**Task 1.5.2: Performance Optimization**
- **ID:** QW-1.5.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-1.5.1
- **Acceptance Criteria:**
  - Lazy load score card component
  - Memoize expensive calculations
  - Optimize image generation (target <2s)
  - Test on low-end mobile devices
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/scorecard/ScoreCard.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useScoreCardImage.ts`

---

## FEATURE 2: PWA Optimization for Mobile Experience

### Phase 2.1: PWA Manifest & Service Worker Setup

**Task 2.1.1: Enhance PWA Manifest**
- **ID:** QW-2.1.1
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Update manifest.json with all required fields
  - Add app icons in all sizes (48, 96, 144, 192, 512)
  - Configure start_url, scope, display mode (standalone)
  - Add shortcuts for quick actions (New Game, Join Game)
  - Test manifest validation
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/public/manifest.json`
  - Add icon files to `/Users/ohadfisher/git/boggle-new/fe-next/public/`

**Task 2.1.2: Update Service Worker Registration**
- **ID:** QW-2.1.2
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Review existing ServiceWorkerRegistration component
  - Add update notification when new version available
  - Implement cache-first strategy for static assets
  - Network-first for API calls
  - Add offline fallback page
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/ServiceWorkerRegistration.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/public/sw.js` (if not exists)
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/public/offline.html`

**Task 2.1.3: Add Install Prompt Component**
- **ID:** QW-2.1.3
- **Estimated Time:** 2 hours
- **Dependencies:** QW-2.1.1
- **Acceptance Criteria:**
  - Create "Add to Home Screen" banner for mobile
  - Show only on second visit (don't be pushy)
  - Use localStorage to track dismissal
  - Platform-specific instructions (iOS vs Android)
  - Neo-brutalist styling with dismiss button
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/pwa/InstallPrompt.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/layout.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

### Phase 2.2: Mobile UI Enhancements

**Task 2.2.1: Optimize Touch Targets**
- **ID:** QW-2.2.1
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Ensure all interactive elements are min 44x44px
  - Increase letter grid cell sizes on mobile
  - Add touch ripple feedback animations
  - Test with accessibility tools (Lighthouse)
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/Board.tsx` (if exists)
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/components/PlayerInGameView.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/globals.css`

**Task 2.2.2: Improve Keyboard on Mobile**
- **ID:** QW-2.2.2
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Auto-focus word input when game starts
  - Prevent keyboard from obscuring game board
  - Add "Go" button behavior for submit
  - Handle virtual keyboard show/hide events
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/components/PlayerInGameView.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/WordInput.tsx` (if exists)

**Task 2.2.3: Add Haptic Feedback**
- **ID:** QW-2.2.3
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Vibration on word validation (success/failure)
  - Subtle vibration on letter selection
  - Vibration on combo milestone
  - Respect user preferences (no vibration if disabled)
  - Graceful fallback for unsupported browsers
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/utils/haptics.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/hooks/usePlayerSocketEvents.ts`

### Phase 2.3: Offline Support

**Task 2.3.1: Cache Game Assets**
- **ID:** QW-2.3.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-2.1.2
- **Acceptance Criteria:**
  - Precache fonts, images, CSS
  - Cache word dictionaries for offline validation
  - Implement cache versioning strategy
  - Add cache size limits (max 50MB)
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/public/sw.js`
  - `/Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs`

**Task 2.3.2: Offline Indicator**
- **ID:** QW-2.3.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-2.3.1
- **Acceptance Criteria:**
  - Show offline banner when connection lost
  - Auto-hide when connection restored
  - Display reconnection status
  - Queue actions for when back online
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/pwa/OfflineIndicator.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/layout.tsx`

### Phase 2.4: Performance Optimization

**Task 2.4.1: Implement Code Splitting**
- **ID:** QW-2.4.1
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Lazy load routes (host, player, results)
  - Dynamic import for heavy components (achievements, leaderboard)
  - Reduce initial bundle size by 30%
  - Add loading skeletons for lazy components
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/page.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/landing/index.tsx`
  - Various component files for dynamic imports

**Task 2.4.2: Optimize Images and Fonts**
- **ID:** QW-2.4.2
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Convert images to WebP/AVIF with fallbacks
  - Use Next.js Image component with proper sizing
  - Subset fonts (only include used characters)
  - Enable font-display: swap
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/layout.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs`
  - Image files in `/Users/ohadfisher/git/boggle-new/fe-next/public/`

**Task 2.4.3: Add Performance Monitoring**
- **ID:** QW-2.4.3
- **Estimated Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  - Track Core Web Vitals (LCP, FID, CLS)
  - Monitor PWA install rate
  - Track offline usage patterns
  - Send metrics to analytics
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/lib/performance.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/GoogleAnalytics.tsx`

---

## FEATURE 3: Instant Rematch Button

### Phase 3.1: Backend Rematch Logic

**Task 3.1.1: Create Rematch Handler**
- **ID:** QW-3.1.1
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Add socket event handler for rematch requests
  - Track rematch votes per game session
  - Trigger new game when majority votes (>50%)
  - Reset game state while preserving players
  - Add cooldown period (5 seconds between games)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/RematchHandler.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/index.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/socket.ts`

**Task 3.1.2: Persist Rematch Preferences**
- **ID:** QW-3.1.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-3.1.1
- **Acceptance Criteria:**
  - Store rematch settings in session
  - Remember previous game config (language, timer, theme)
  - Auto-apply same settings for rematch
  - Allow host to override settings
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/modules/GameSession.ts` (if exists)
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/RematchHandler.ts`

### Phase 3.2: Frontend Rematch UI

**Task 3.2.1: Create Rematch Button Component**
- **ID:** QW-3.2.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-3.1.1
- **Acceptance Criteria:**
  - Large, prominent button on results page
  - Show vote count in real-time
  - Animate when votes increase
  - Disabled during cooldown with countdown
  - Neo-brutalist styling with `shadow-hard-lg`
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchButton.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/results/page.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 3.2.2: Add Rematch Notification Toast**
- **ID:** QW-3.2.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-3.2.1
- **Acceptance Criteria:**
  - Show toast when players vote for rematch
  - Display "3/5 players want a rematch!"
  - Auto-hide after 3 seconds
  - Use existing toast system (react-hot-toast)
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchButton.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/notifications/RematchToast.tsx`

**Task 3.2.3: Implement Auto-Start Countdown**
- **ID:** QW-3.2.3
- **Estimated Time:** 1 hour
- **Dependencies:** QW-3.2.2
- **Acceptance Criteria:**
  - Show 5-second countdown when majority reached
  - Allow players to cancel during countdown
  - Display "Starting in 3... 2... 1..."
  - Smooth transition to new game
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchButton.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchCountdown.tsx`

### Phase 3.3: Socket Integration

**Task 3.3.1: Add Rematch Socket Events**
- **ID:** QW-3.3.1
- **Estimated Time:** 1 hour
- **Dependencies:** QW-3.1.1
- **Acceptance Criteria:**
  - Emit `requestRematch` event on button click
  - Listen for `rematchVoteUpdate` event
  - Listen for `rematchStarting` event
  - Handle disconnections (remove vote)
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/utils/SocketContext.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchButton.tsx`

**Task 3.3.2: Handle Edge Cases**
- **ID:** QW-3.3.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-3.3.1
- **Acceptance Criteria:**
  - Handle host leaving during rematch countdown
  - Transfer host if needed
  - Cancel rematch if too many players leave
  - Show appropriate error messages
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/RematchHandler.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/results/RematchButton.tsx`

### Phase 3.4: Testing

**Task 3.4.1: E2E Rematch Tests**
- **ID:** QW-3.4.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-3.3.2
- **Acceptance Criteria:**
  - Test successful rematch flow (2+ players)
  - Test rematch cancellation
  - Test host leaving during rematch
  - Test rapid rematch clicks (cooldown)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/e2e/rematch.spec.ts`

---

## FEATURE 4: Player Levels & XP System

### Phase 4.1: Database Schema & Backend Logic

**Task 4.1.1: Create XP Database Schema**
- **ID:** QW-4.1.1
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Add `user_levels` table to Supabase
  - Columns: user_id, level, total_xp, created_at, updated_at
  - Add `xp_transactions` table for history
  - Create indexes on user_id and level
  - Write migration script
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/supabase/migrations/YYYYMMDD_add_xp_system.sql`
  - `/Users/ohadfisher/git/boggle-new/fe-next/supabase/migrations/run-migrations.js`

**Task 4.1.2: Define XP Calculation Rules**
- **ID:** QW-4.1.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.1
- **Acceptance Criteria:**
  - Document XP formula: base score * multipliers
  - Win bonus: +50 XP (1st), +30 XP (2nd), +20 XP (3rd)
  - Participation: +10 XP per game
  - Achievement bonuses: +5-25 XP
  - Create TypeScript constants file
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/shared/constants/xp.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/xp.ts`

**Task 4.1.3: Implement XP Award Logic**
- **ID:** QW-4.1.3
- **Estimated Time:** 3 hours
- **Dependencies:** QW-4.1.2
- **Acceptance Criteria:**
  - Calculate XP on game end
  - Update user_levels table
  - Log to xp_transactions
  - Emit XP gained event to frontend
  - Handle level-up detection
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/modules/XPManager.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/GameResultsHandler.ts` (if exists)
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/socket.ts`

**Task 4.1.4: Create Level Progression System**
- **ID:** QW-4.1.4
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.3
- **Acceptance Criteria:**
  - Define level thresholds (exponential curve)
  - Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
  - Max level: 100
  - Calculate XP required for next level
  - Add level badges/titles
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/constants/xp.ts`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/shared/utils/levelCalculations.ts`

### Phase 4.2: Frontend XP Display

**Task 4.2.1: Create XP Bar Component**
- **ID:** QW-4.2.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.4
- **Acceptance Criteria:**
  - Progress bar showing XP to next level
  - Display current level and total XP
  - Animated fill on XP gain
  - Neo-brutalist styling with chunky borders
  - Responsive design (mobile & desktop)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/xp/XPBar.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/xp/LevelBadge.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 4.2.2: Add XP to Player Profile**
- **ID:** QW-4.2.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-4.2.1
- **Acceptance Criteria:**
  - Show XP bar in player profile/waiting room
  - Display level next to username
  - Add level icon/badge
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/components/PlayerWaitingView.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/profile/ProfileCard.tsx` (if exists)

**Task 4.2.3: Create XP Gain Animation**
- **ID:** QW-4.2.3
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.2.1
- **Acceptance Criteria:**
  - Float "+50 XP" text on gain
  - Animate progress bar fill
  - Use Framer Motion for smooth animations
  - Show breakdown: "+30 base, +20 win bonus"
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/xp/XPGainAnimation.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/results/page.tsx`

### Phase 4.3: Level-Up Experience

**Task 4.3.1: Create Level-Up Modal**
- **ID:** QW-4.3.1
- **Estimated Time:** 3 hours
- **Dependencies:** QW-4.1.3
- **Acceptance Criteria:**
  - Full-screen celebration modal
  - Display new level and title
  - Confetti animation (canvas-confetti)
  - Show unlocked perks/rewards
  - Dismissible with "Continue" button
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/xp/LevelUpModal.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/results/page.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 4.3.2: Add Level Titles/Badges**
- **ID:** QW-4.3.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-4.3.1
- **Acceptance Criteria:**
  - Create level title system (Novice, Wordsmith, Master, Legend, etc.)
  - 10 tiers with 10 levels each
  - Display title on profile and leaderboard
  - Translate titles to all 4 languages
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/constants/xp.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 4.3.3: Socket Integration for XP Events**
- **ID:** QW-4.3.3
- **Estimated Time:** 1 hour
- **Dependencies:** QW-4.1.3, QW-4.2.3
- **Acceptance Criteria:**
  - Listen for `xpGained` socket event
  - Listen for `levelUp` socket event
  - Update local state on receive
  - Trigger animations
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/hooks/usePlayerSocketEvents.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/utils/SocketContext.tsx`

### Phase 4.4: XP History & Analytics

**Task 4.4.1: Create XP History Page**
- **ID:** QW-4.4.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.1
- **Acceptance Criteria:**
  - Display XP transaction history
  - Show date, amount, source (game/achievement)
  - Paginated list (10 per page)
  - Filter by date range
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/profile/xp-history/page.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/xp/XPHistoryList.tsx`

**Task 4.4.2: Add XP Leaderboard**
- **ID:** QW-4.4.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.1
- **Acceptance Criteria:**
  - Show top 100 players by level/XP
  - Display username, level, total XP
  - Highlight current user's rank
  - Add filters: All-Time, This Week, This Month
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/leaderboard/xp/page.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/leaderboard/XPLeaderboard.tsx`

### Phase 4.5: Testing

**Task 4.5.1: Unit Tests for XP Logic**
- **ID:** QW-4.5.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-4.1.3, QW-4.1.4
- **Acceptance Criteria:**
  - Test XP calculation formulas
  - Test level progression math
  - Test edge cases (negative XP, max level)
  - Achieve >90% coverage
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/__tests__/backend/XPManager.test.ts`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/__tests__/shared/levelCalculations.test.ts`

---

## FEATURE 5: Enhanced Achievements

### Phase 5.1: New Achievement Categories

**Task 5.1.1: Define New Achievement Types**
- **ID:** QW-5.1.1
- **Estimated Time:** 2 hours
- **Dependencies:** None
- **Acceptance Criteria:**
  - Document 15+ new achievements across categories:
    - Speed: "Lightning Round" (10 words in 30 seconds)
    - Combos: "Combo Master" (10x combo)
    - Words: "Vocabulary Virtuoso" (find 50 unique words in one game)
    - Social: "Party Starter" (play with 10 different people)
    - Consistency: "Dedicated" (play 7 days in a row)
  - Create TypeScript interfaces
  - Add to translations
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/constants/achievements.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/achievements.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 5.1.2: Create Achievement Icons**
- **ID:** QW-5.1.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-5.1.1
- **Acceptance Criteria:**
  - Design or source 15+ achievement badge SVGs
  - Use consistent style (neo-brutalist)
  - 3 tiers per achievement (bronze, silver, gold)
  - Export as React components
  - Optimize file sizes (<5KB each)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/icons/` (directory)
  - NEW: Multiple icon component files

### Phase 5.2: Achievement Tracking Backend

**Task 5.2.1: Update Achievement Database Schema**
- **ID:** QW-5.2.1
- **Estimated Time:** 1 hour
- **Dependencies:** QW-5.1.1
- **Acceptance Criteria:**
  - Add new achievement IDs to database
  - Add progress tracking fields
  - Add `achievements_progress` table
  - Migration script
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/supabase/migrations/YYYYMMDD_add_new_achievements.sql`
  - Existing achievement tables

**Task 5.2.2: Implement Achievement Detection Logic**
- **ID:** QW-5.2.2
- **Estimated Time:** 4 hours
- **Dependencies:** QW-5.2.1
- **Acceptance Criteria:**
  - Track achievement progress in real-time
  - Check conditions on each game event
  - Award achievement when conditions met
  - Emit achievement unlocked event
  - Support multi-game achievements (streaks)
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/backend/modules/AchievementTracker.ts` (if exists)
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/modules/AchievementDetectors.ts`
  - Various handler files

**Task 5.2.3: Add Achievement Progress API**
- **ID:** QW-5.2.3
- **Estimated Time:** 2 hours
- **Dependencies:** QW-5.2.2
- **Acceptance Criteria:**
  - Endpoint to fetch user's achievement progress
  - Return: unlocked, in-progress, locked achievements
  - Include progress percentages
  - Cache results (5 minute TTL)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/handlers/AchievementProgressHandler.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/shared/types/socket.ts`

### Phase 5.3: Achievement Display UI

**Task 5.3.1: Create Achievement Gallery Component**
- **ID:** QW-5.3.1
- **Estimated Time:** 3 hours
- **Dependencies:** QW-5.1.2, QW-5.2.3
- **Acceptance Criteria:**
  - Grid layout showing all achievements
  - Color-coded by status (unlocked, in-progress, locked)
  - Show progress bars for in-progress
  - Modal with detailed view on click
  - Filter by category
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementGallery.tsx`
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementCard.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/index.ts`

**Task 5.3.2: Enhance Achievement Unlock Animation**
- **ID:** QW-5.3.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-5.3.1
- **Acceptance Criteria:**
  - Review existing achievement queue system
  - Add badge reveal animation (flip/slide)
  - Play sound effect on unlock
  - Show XP bonus earned
  - Queue multiple achievements
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementQueue.tsx` (if exists)
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementUnlockModal.tsx`

**Task 5.3.3: Add Achievements to Profile Page**
- **ID:** QW-5.3.3
- **Estimated Time:** 1 hour
- **Dependencies:** QW-5.3.1
- **Acceptance Criteria:**
  - Show achievement count (X/50 unlocked)
  - Display showcase of top 3 rarest achievements
  - Link to full achievement gallery
  - Show completion percentage
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/profile/page.tsx` (if exists)
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/profile/AchievementShowcase.tsx`

### Phase 5.4: Achievement Notifications

**Task 5.4.1: Create Achievement Toast Component**
- **ID:** QW-5.4.1
- **Estimated Time:** 1 hour
- **Dependencies:** QW-5.3.2
- **Acceptance Criteria:**
  - Small notification during gameplay
  - Show achievement icon and name
  - Auto-dismiss after 5 seconds
  - Click to view details
  - Don't interrupt game flow
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementToast.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/hooks/usePlayerSocketEvents.ts`

**Task 5.4.2: Add Achievement Progress Hints**
- **ID:** QW-5.4.2
- **Estimated Time:** 1 hour
- **Dependencies:** QW-5.2.3
- **Acceptance Criteria:**
  - Show "almost there" hints (90%+ progress)
  - Display during waiting room
  - "3 more combos for Combo Master!"
  - Limit to 1 hint at a time
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementHint.tsx`
  - `/Users/ohadfisher/git/boggle-new/fe-next/player/components/PlayerWaitingView.tsx`

### Phase 5.5: Social & Rare Achievements

**Task 5.5.1: Implement Rare Achievement Detection**
- **ID:** QW-5.5.1
- **Estimated Time:** 2 hours
- **Dependencies:** QW-5.2.2
- **Acceptance Criteria:**
  - Calculate achievement rarity (% of players who have it)
  - Update rarity daily
  - Display rarity tier (Common, Rare, Epic, Legendary)
  - Special animation for Legendary unlocks
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/backend/jobs/calculateAchievementRarity.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/AchievementCard.tsx`

**Task 5.5.2: Add Achievement Sharing**
- **ID:** QW-5.5.2
- **Estimated Time:** 2 hours
- **Dependencies:** QW-5.5.1, QW-1.3.2 (reuse score card image generation)
- **Acceptance Criteria:**
  - Generate achievement unlock image
  - Include badge, name, description, rarity
  - Share via Web Share API
  - Post to results feed (if exists)
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/components/achievements/ShareAchievement.tsx`
  - Reuse: `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useScoreCardImage.ts`

### Phase 5.6: Testing

**Task 5.6.1: Achievement Integration Tests**
- **ID:** QW-5.6.1
- **Estimated Time:** 3 hours
- **Dependencies:** QW-5.2.2
- **Acceptance Criteria:**
  - Test each achievement unlock condition
  - Test progress tracking accuracy
  - Test edge cases (simultaneous unlocks)
  - Mock game scenarios
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/__tests__/backend/AchievementDetectors.test.ts`

---

## CROSS-FEATURE TASKS

### Integration & Polish

**Task INT-1: Update Translations**
- **ID:** QW-INT-1
- **Estimated Time:** 3 hours
- **Dependencies:** All feature tasks
- **Acceptance Criteria:**
  - Add all new UI strings to translation files
  - Translate to Hebrew, English, Swedish, Japanese
  - Verify RTL layout for Hebrew
  - Test all languages in production
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/he.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/en.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/sv.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/translations/ja.ts`

**Task INT-2: Accessibility Audit**
- **ID:** QW-INT-2
- **Estimated Time:** 2 hours
- **Dependencies:** All UI tasks
- **Acceptance Criteria:**
  - Run Lighthouse accessibility scan (target >95)
  - Test keyboard navigation for all new features
  - Verify screen reader compatibility
  - Fix any WCAG 2.1 AA violations
- **Files to Modify:**
  - Various component files

**Task INT-3: E2E Testing Suite**
- **ID:** QW-INT-3
- **Estimated Time:** 4 hours
- **Dependencies:** All feature tasks
- **Acceptance Criteria:**
  - Write Playwright tests for complete user flows
  - Test: share victory, rematch, level up, unlock achievement
  - Run on mobile viewport sizes
  - Add to CI/CD pipeline
- **Files to Modify:**
  - NEW: `/Users/ohadfisher/git/boggle-new/fe-next/e2e/quick-wins.spec.ts`
  - `/Users/ohadfisher/git/boggle-new/fe-next/playwright.config.ts`

**Task INT-4: Performance Testing**
- **ID:** QW-INT-4
- **Estimated Time:** 2 hours
- **Dependencies:** All feature tasks
- **Acceptance Criteria:**
  - Lighthouse performance score >90
  - Time to Interactive <3s on 3G
  - First Contentful Paint <1.5s
  - Bundle size increase <100KB
- **Files to Modify:**
  - Various optimization files

**Task INT-5: Documentation**
- **ID:** QW-INT-5
- **Estimated Time:** 2 hours
- **Dependencies:** All feature tasks
- **Acceptance Criteria:**
  - Update CLAUDE.md with new features
  - Document XP/achievement formulas
  - Add API documentation for new endpoints
  - Create user-facing changelog
- **Files to Modify:**
  - `/Users/ohadfisher/git/boggle-new/fe-next/CLAUDE.md`
  - NEW: `/Users/ohadfisher/git/boggle-new/CHANGELOG.md`

---

## TASK SUMMARY

### Total Estimated Time: 115 hours (~3 weeks for 1 developer)

### By Feature:
1. **Victory Sharing Graphics:** 18 hours
2. **PWA Optimization:** 18 hours
3. **Instant Rematch:** 11 hours
4. **Player Levels & XP:** 25 hours
5. **Enhanced Achievements:** 28 hours
6. **Cross-Feature Integration:** 15 hours

### Dependency Graph (Critical Path):

```
START
  |
  ├─> QW-1.1.1 → QW-1.1.2 → QW-1.2.1 → QW-1.3.1 → QW-1.3.2 → QW-1.4.1 → QW-1.4.2 → QW-1.4.3
  |
  ├─> QW-2.1.1 → QW-2.1.2 → QW-2.1.3
  |     ├─> QW-2.2.1 → QW-2.2.2 → QW-2.2.3
  |     └─> QW-2.3.1 → QW-2.3.2
  |
  ├─> QW-3.1.1 → QW-3.1.2 → QW-3.2.1 → QW-3.3.1 → QW-3.3.2
  |
  ├─> QW-4.1.1 → QW-4.1.2 → QW-4.1.3 → QW-4.1.4
  |     ├─> QW-4.2.1 → QW-4.2.2 → QW-4.2.3
  |     ├─> QW-4.3.1 → QW-4.3.2 → QW-4.3.3
  |     └─> QW-4.4.1 → QW-4.4.2
  |
  ├─> QW-5.1.1 → QW-5.1.2 → QW-5.2.1 → QW-5.2.2 → QW-5.2.3
  |     ├─> QW-5.3.1 → QW-5.3.2 → QW-5.3.3
  |     ├─> QW-5.4.1 → QW-5.4.2
  |     └─> QW-5.5.1 → QW-5.5.2
  |
  └─> QW-INT-1 → QW-INT-2 → QW-INT-3 → QW-INT-4 → QW-INT-5
  |
END
```

### Recommended Execution Order (for single developer):

**Week 1:** Foundation
- Day 1-2: Feature 4 (XP System) - Backend (QW-4.1.x)
- Day 3: Feature 3 (Rematch) - Backend (QW-3.1.x)
- Day 4: Feature 5 (Achievements) - Backend (QW-5.1.x, QW-5.2.x)
- Day 5: Feature 1 (Victory Sharing) - Setup (QW-1.1.x, QW-1.2.1)

**Week 2:** UI & Features
- Day 1-2: Feature 4 - Frontend (QW-4.2.x, QW-4.3.x)
- Day 3: Feature 3 - Frontend (QW-3.2.x, QW-3.3.x)
- Day 4: Feature 5 - Frontend (QW-5.3.x, QW-5.4.x)
- Day 5: Feature 1 - Image Gen (QW-1.3.x, QW-1.4.x)

**Week 3:** PWA & Polish
- Day 1-2: Feature 2 (PWA) - All tasks
- Day 3: Feature 5 - Social (QW-5.5.x)
- Day 4: Integration (QW-INT-1, QW-INT-2)
- Day 5: Testing & Docs (QW-INT-3, QW-INT-4, QW-INT-5)

### Parallel Work Opportunities:
- Features 1 & 2 can be developed in parallel
- Features 3 & 4 can be developed in parallel
- Feature 5 backend can start while other features are in progress

### Risk Mitigation:
- Canvas image generation (QW-1.3.2) may need extra testing on mobile
- PWA service worker (QW-2.1.2) requires careful cache management
- XP calculations (QW-4.1.3) need thorough testing for edge cases
- Achievement tracking (QW-5.2.2) complexity may exceed estimate

---

## NEXT STEPS

1. **Review and prioritize** tasks based on business goals
2. **Set up project board** (GitHub Projects/Jira) with these tasks
3. **Assign tasks** to team members
4. **Create feature branches** for each major feature
5. **Set up CI/CD** for automated testing
6. **Schedule sprint planning** (recommend 2-week sprints)

## NOTES

- All time estimates are for an experienced developer familiar with the codebase
- Add 20-30% buffer for unforeseen issues
- Some tasks may be faster if components can be reused
- Testing time is included in each task but comprehensive E2E testing is separate
- Translation work assumes native speakers available for verification
