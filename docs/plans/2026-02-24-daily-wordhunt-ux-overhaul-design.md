# Daily Word Hunt UX Overhaul — Design

**Date**: 2026-02-24
**Status**: Approved

## Goals
1. Auto-enter word hunt from landing (smart routing)
2. Daily Buzz as secondary action (only after word hunt completion)
3. Screenshot-worthy results page (the screen IS the share mechanic)
4. Playful + celebratory animations matching neo-brutalist style

## 1. Smart Routing

`DailyChallengeRouter` becomes a gateway:
- Not played today → `router.replace(/${lang}/daily/word-hunt)` immediately
- Already played → render landing with results hero + Buzz secondary
- Brief loading skeleton while checking status (no flash)
- Uses `router.replace` (not push) to prevent back-button loop

## 2. Landing Restructure

When user HAS completed word hunt:
- **Hero**: Word Hunt results summary card (score, rank, streak) — tappable for full results
- **Below**: "Continue daily missions" with Buzz as smaller secondary quest
- Remove equal-weight parallel layout → clear visual hierarchy
- `QuestCard` gets size variants: `primary` (current) vs `secondary` (smaller, muted)

## 3. Results Screen Redesign

### Score Hero Section
- Large animated score with count-up (slot machine roll)
- Neo-brutalist badge frame: thick borders, hard shadow, slight tilt rotation
- Puzzle # + date as "stamp" element
- Target word: letter-by-letter pop-in

### Performance Bars
- Animated fill with bounce for efficiency, life, words found
- Staggered spring timing
- Color-coded: lime (great), orange (ok), pink (needs work)

### Rank Badge
- Centered, large pop-in with wobble
- Percentile text underneath

### Share CTA
- Existing share buttons stay but secondary
- Add subtle "Screenshot & share!" hint text
- The screen itself IS the share

### Layout
- Ensure no blank frame on `completed` phase transition
- Clean crossfade from game → results

## 4. Animation Choreography

**Base**: Playful & energetic (bouncy springs, wobbles, pop-ins)
**Peaks**: Celebratory (count-ups, confetti, screen shake on rank reveal)

### Staggered Entrance Sequence
1. Score badge slams in (0ms) — spring with overshoot
2. Target word letters pop one-by-one (200ms)
3. Performance bars fill with bounce (400ms)
4. Rank badge pops with wobble + screen shake (600ms)
5. Share section slides up (800ms)

### Micro-interactions
- Score badge tap → confetti burst (enhance existing)
- Performance bars → number count-up while filling
- Streak counter → flame wobble

## 5. Files to Modify

| File | Change |
|------|--------|
| `DailyChallengeRouter.tsx` | Smart routing logic |
| `DailyChallengeLanding.tsx` | Hierarchy restructure, results hero |
| `DailyWordHuntResults.tsx` | Layout redesign, animation choreography |
| `results/ResultDisplay.tsx` | Score hero with animations |
| `results/PerformanceSection.tsx` | Animated fill bars |
| `results/RankBadge.tsx` | Pop-in animation |
| `results/ShareSection.tsx` | Secondary positioning, screenshot hint |
| `results/ScoreBadge.tsx` | Slam-in animation |
| `landing/QuestCard.tsx` | Size variants |

## 6. Out of Scope (YAGNI)
- No new share image generation pipeline
- No new API endpoints
- No game mechanics or scoring changes
- No Buzz game changes
- Minimal new translation keys (screenshot hint only)
