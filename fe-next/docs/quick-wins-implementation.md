# Quick Wins Implementation Plan

## Priority 1: Enhanced Share Cards

### Implementation

```typescript
// components/share/ShareCardGenerator.tsx
interface ShareCardData {
  mode: 'daily' | 'multiplayer' | 'singleplayer';
  score: number;
  rank?: number;
  topWord: string;
  bestCombo: number;
  percentile?: number;
  puzzleNumber?: number;
  timestamp: string;
}

// Generates an SVG or Canvas-based share card
// Exports to PNG for social sharing
// Creates deep link: /play?challenge=daily:482
```

### Files to Create/Modify
1. `components/share/ShareCardGenerator.tsx` - NEW
2. `components/share/ShareButton.tsx` - Modify
3. `app/api/share/og/route.tsx` - NEW (OpenGraph image)
4. `utils/shareUtils.ts` - NEW
5. `translations/en.js, he.js, sv.js, ja.js, es.js` - Add keys

### Translation Keys Needed
```javascript
share: {
  title: 'Share Your Results!',
  subtitle: 'Challenge your friends to beat your score',
  copyLink: 'Copy Link',
  copyImage: 'Copy Image',
  shareTwitter: 'Share on X',
  shareWhatsApp: 'Share on WhatsApp',
  beatMyScore: 'Can you beat my score?',
  perfectGame: 'Perfect Game!',
  topPercentile: 'Top {{percentile}}% today',
}
```

---

## Priority 2: Session Goals System

### Database Schema
```sql
CREATE TABLE daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  goal_type VARCHAR(50) NOT NULL, -- 'word_length', 'combo', 'accuracy', 'specific_word'
  target_value INTEGER NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  UNIQUE(date, goal_type)
);

CREATE TABLE user_daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  goal_id UUID REFERENCES daily_goals(id),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  UNIQUE(user_id, goal_id)
);
```

### Goal Types
1. **Word Length Goal:** "Find 3 words with 6+ letters"
2. **Combo Goal:** "Maintain a 5x combo for 30 seconds"
3. **Accuracy Goal:** "Find 10 words with 90%+ accuracy"
4. **Hidden Word Goal:** "Find the hidden word: MYSTERY"
5. **Speed Goal:** "Find 5 words in 60 seconds"
6. **Rarity Goal:** "Find 1 Legendary word"

### Implementation Files
1. `hooks/useDailyGoals.ts` - NEW
2. `components/goals/DailyGoalsPanel.tsx` - NEW
3. `components/goals/GoalProgressRing.tsx` - NEW
4. `app/api/goals/route.ts` - NEW
5. `backend/modules/goalsEngine.ts` - NEW

---

## Priority 3: Personal Best Celebrations

### Celebration Triggers
```typescript
interface CelebrationTrigger {
  type: 'high_score' | 'longest_word' | 'best_combo' | 'streak_milestone';
  threshold: number;
  animation: string;
  sound?: string;
}

const CELEBRATIONS: CelebrationTrigger[] = [
  { type: 'high_score', threshold: 0, animation: 'confetti' }, // Any new PB
  { type: 'longest_word', threshold: 7, animation: 'letters_burst' },
  { type: 'longest_word', threshold: 9, animation: 'mega_burst' },
  { type: 'best_combo', threshold: 10, animation: 'fireworks' },
  { type: 'streak_milestone', threshold: 7, animation: 'streak_flames' },
  { type: 'streak_milestone', threshold: 30, animation: 'legendary_streak' },
];
```

### Components
1. `components/celebrations/CelebrationModal.tsx` - NEW
2. `components/celebrations/ConfettiEffect.tsx` - NEW (reuse existing)
3. `components/celebrations/LettersBurstEffect.tsx` - NEW
4. `hooks/useCelebrationTrigger.ts` - NEW

---

## Implementation Order

### Week 1
- Day 1-2: Share card component + API
- Day 3-4: Integrate share buttons in all result screens
- Day 5: Translation keys + testing

### Week 2
- Day 1-2: Daily goals database + API
- Day 3: Goals UI components
- Day 4: Integrate into game HUD
- Day 5: Progress tracking + testing

### Week 3
- Day 1-2: Celebration system architecture
- Day 3-4: Animation effects
- Day 5: Integration + polish

---

## Success Metrics

### Share Cards
- Share rate per game: Target 15%
- Click-through rate on shared links: Target 25%
- New user acquisition from shares: Target 10% of total

### Session Goals
- Goal completion rate: Target 60%
- Average goals completed per session: Target 1.5
- XP earned from goals: Target 20% of total XP

### Celebrations
- Celebration events per session: Target 0.8
- Player satisfaction (survey): Target 4.5/5

---

## Technical Notes

### Performance
- Share card generation: < 500ms
- Goal progress updates: Optimistic UI
- Celebration animations: GPU-accelerated, skip if reduced motion

### Accessibility
- Share cards: Alt text for images
- Goals: Screen reader announcements for progress
- Celebrations: Respect `prefers-reduced-motion`

### Mobile Considerations
- Share cards: Optimize for mobile screen sizes
- Goals: Collapsible panel to save space
- Celebrations: Touch-friendly dismiss

---

## Testing Checklist

### Share Cards
- [ ] Generates correctly for all game modes
- [ ] Exports PNG in all languages
- [ ] Deep links work on all platforms
- [ ] OG images render correctly on social

### Goals
- [ ] Goals rotate at midnight
- [ ] Progress persists across sessions
- [ ] Rewards granted correctly
- [ ] Edge cases (disconnect mid-game)

### Celebrations
- [ ] Triggers at correct thresholds
- [ ] Animations smooth on low-end devices
- [ ] Can be dismissed/skipped
- [ ] No duplicate triggers
