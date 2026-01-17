# Next Challenge Prompt - Integration Guide

## Overview

The `NextChallengePrompt` component creates an engagement loop to keep players active after completing a daily challenge:

1. ✅ Completed **Word Hunt** → Suggests **Daily Buzz** (if not done today)
2. ✅ Completed **Buzz** → Suggests **Word Hunt** (if not done today)
3. ✅ Completed **Both** → Suggests **Multiplayer** or **Bot Game**

---

## Quick Integration

### Step 1: Import the Component

```typescript
import { NextChallengePrompt, markDailyChallengeComplete } from '@/components/daily/NextChallengePrompt';
```

### Step 2: Add to Results Screen

In your Daily Challenge results component (e.g., `DailyWordHuntResults.tsx` or `DailyBuzzResults.tsx`):

```tsx
export function DailyWordHuntResults() {
  const { locale } = useParams();

  useEffect(() => {
    // Mark challenge as completed when results are shown
    markDailyChallengeComplete('word_hunt');
  }, []);

  return (
    <div className="results-container">
      {/* Your existing results UI */}
      <h2>Results</h2>
      <div className="score">...</div>
      <div className="leaderboard">...</div>

      {/* Add Next Challenge Prompt */}
      <NextChallengePrompt
        completedChallenge="word_hunt"
        locale={locale as string}
      />
    </div>
  );
}
```

### Step 3: For Daily Buzz Results

```tsx
export function DailyBuzzResults() {
  const { locale } = useParams();

  useEffect(() => {
    // Mark Buzz as completed
    markDailyChallengeComplete('buzz');
  }, []);

  return (
    <div className="results-container">
      {/* Your existing results UI */}

      {/* Add Next Challenge Prompt */}
      <NextChallengePrompt
        completedChallenge="buzz"
        locale={locale as string}
      />
    </div>
  );
}
```

---

## Component API

### Props

| Prop | Type | Description |
|------|------|-------------|
| `completedChallenge` | `'word_hunt' \| 'buzz'` | Which challenge was just completed |
| `locale` | `string` | Current locale for routing (e.g., 'en', 'he', 'sv') |

### Helper Functions

#### `markDailyChallengeComplete(challengeType)`

Marks a daily challenge as completed for today. Stores completion status in `localStorage`.

```typescript
markDailyChallengeComplete('word_hunt');
markDailyChallengeComplete('buzz');
```

#### `hasCompletedBothDailyChallenges()`

Returns `true` if user has completed both Word Hunt and Buzz today.

```typescript
const bothDone = hasCompletedBothDailyChallenges();
if (bothDone) {
  console.log('Player completed both challenges!');
}
```

---

## localStorage Keys

The component uses these localStorage keys:

- `daily_word_hunt_completed`: Date string (YYYY-MM-DD) of last Word Hunt completion
- `daily_buzz_completed`: Date string (YYYY-MM-DD) of last Buzz completion

Example:
```
daily_word_hunt_completed: "2026-01-17"
daily_buzz_completed: "2026-01-17"
```

---

## Analytics Tracking

The component automatically tracks engagement via GA4:

```javascript
gameEvents.trackEvent('next_challenge_click', {
  from_challenge: 'word_hunt', // or 'buzz'
  to_action: 'buzz' // or 'word_hunt' or 'multiplayer'
});
```

### Analytics Dashboard

Monitor these metrics in GA4:
- **Event Name**: `next_challenge_click`
- **Parameters**:
  - `from_challenge`: Source challenge
  - `to_action`: Destination clicked

### Key Metrics to Track

1. **Cross-Play Rate**: % of players who complete both daily challenges
2. **Multiplayer Conversion**: % who click multiplayer after both challenges
3. **Session Time**: Average session duration with/without prompt

---

## Design

The component uses **neo-brutalist design** matching LexiClash's style:

- **Word Hunt**: Cyan background with ⚡ icon
- **Buzz**: Pink background with 🔥 icon
- **Multiplayer**: Lime background with 🎮 icon

Features:
- Hard shadows (no blur)
- Bold typography
- Animated CTA button
- Responsive design

---

## i18n Support

All copy is fully translated in 5 languages:

- 🇬🇧 **English** (en)
- 🇮🇱 **Hebrew** (he) - RTL support
- 🇸🇪 **Swedish** (sv)
- 🇯🇵 **Japanese** (ja)
- 🇪🇸 **Spanish** (es)

Translation keys:
```
daily.nextChallenge.wordHuntTitle
daily.nextChallenge.wordHuntDesc
daily.nextChallenge.wordHuntCTA
daily.nextChallenge.buzzTitle
daily.nextChallenge.buzzDesc
daily.nextChallenge.buzzCTA
daily.nextChallenge.multiplayerTitle
daily.nextChallenge.multiplayerDesc
daily.nextChallenge.multiplayerCTA
```

---

## Example Integration Locations

### Recommended Placement

1. **Word Hunt Results**: After leaderboard, before "Come back tomorrow"
2. **Buzz Results**: After score summary, before share buttons
3. **Both**: Always show at bottom of results screen

### File Locations to Integrate

```
components/daily/
├── DailyWordHuntSurvival.tsx    ← Add to results section
├── DailyBuzzChallenge.tsx       ← Add to results section
└── NextChallengePrompt.tsx      ← Already created ✅
```

---

## Testing

### Manual Test Flow

1. Complete Word Hunt → Should see "Try Daily Buzz" prompt
2. Click prompt → Navigate to /daily with Buzz highlighted
3. Complete Buzz → Should see "Try Word Hunt" prompt OR "Play Multiplayer"
4. Complete both → Should only see "Play Multiplayer" prompt
5. Next day → localStorage clears, prompts reset

### Automated Tests (Recommended)

```typescript
describe('NextChallengePrompt', () => {
  it('suggests Buzz after Word Hunt', () => {
    localStorage.setItem('daily_word_hunt_completed', '2026-01-17');
    render(<NextChallengePrompt completedChallenge="word_hunt" locale="en" />);
    expect(screen.getByText(/Daily Buzz/i)).toBeInTheDocument();
  });

  it('suggests Word Hunt after Buzz', () => {
    localStorage.setItem('daily_buzz_completed', '2026-01-17');
    render(<NextChallengePrompt completedChallenge="buzz" locale="en" />);
    expect(screen.getByText(/Word Hunt/i)).toBeInTheDocument();
  });

  it('suggests Multiplayer when both complete', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('daily_word_hunt_completed', today);
    localStorage.setItem('daily_buzz_completed', today);
    render(<NextChallengePrompt completedChallenge="buzz" locale="en" />);
    expect(screen.getByText(/Multiplayer/i)).toBeInTheDocument();
  });
});
```

---

## Performance Considerations

- **Bundle Size**: ~3KB (minified + gzipped)
- **Dependencies**: Framer Motion (already in project)
- **localStorage**: Minimal storage (~50 bytes)
- **Re-renders**: Optimized with useEffect dependency array

---

## Accessibility

- ✅ Keyboard navigable
- ✅ Screen reader friendly (ARIA labels)
- ✅ High contrast (neo-brutalist design)
- ✅ Respects `prefers-reduced-motion`

---

## Future Enhancements (Optional)

1. **Personalization**: Show different multiplayer suggestions based on player level
2. **A/B Testing**: Test different CTA copy for conversion optimization
3. **Deep Links**: Direct users to specific challenge type
4. **Animated Illustrations**: Add micro-animations to icons
5. **Progress Indicators**: Show "1/2 challenges complete" badge

---

## Support

Questions? Check:
- Component source: `components/daily/NextChallengePrompt.tsx`
- Translations: `translations/{locale}.js` → `daily.nextChallenge`
- Analytics: `components/GoogleAnalytics.tsx` → `gameEvents.trackEvent()`

---

**Built with ❤️ for LexiClash**
