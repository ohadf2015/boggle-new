# 🎆 New Year's Eve Celebration Feature

A delightful New Year's Eve surprise for LexiClash players, featuring countdown and celebration animations in your neo-brutalist style!

## ✨ What's New

### Components Created

1. **[useNewYearDetection.ts](fe-next/hooks/useNewYearDetection.ts)**
   - Timezone-aware hook that detects New Year's Eve and midnight
   - Calculates countdown in player's local timezone
   - Returns state for pre-countdown, countdown, and celebration phases

2. **[NewYearFireworks.tsx](fe-next/components/celebration/NewYearFireworks.tsx)**
   - Neo-brutalist styled fireworks animation
   - Uses your brand colors (yellow, pink, cyan, purple, orange)
   - Hard shadows and bold styling consistent with your design system
   - GPU-optimized with framer-motion

3. **[NewYearCountdown.tsx](fe-next/components/celebration/NewYearCountdown.tsx)**
   - Main countdown and celebration component
   - Three phases:
     - **11:55 PM**: Pre-notification toast appears
     - **11:59:50 PM**: Countdown modal with final 10 seconds
     - **Midnight**: Fireworks explosion with "Happy New Year!" message

### Translations Added

All language files updated with New Year messages:
- ✅ English (en.js)
- ✅ Spanish (es.js)
- ✅ Hebrew (he.js)
- ✅ Japanese (ja.js)
- ✅ Swedish (sv.js)

Translation keys:
```javascript
{
  "newYear": {
    "comingSoon": "Something special coming soon...",
    "countdownTitle": "New Year Countdown",
    "countdownSubtitle": "Get ready to celebrate!",
    "almostThere": "Almost there!",
    "happyNewYear": "Happy New Year!",
    "celebrationMessage": "Wishing you an amazing year ahead filled with words, wins, and wonder!"
  }
}
```

## 🎯 How It Works

### Timeline (Player's Local Time)

1. **11:55 PM** - Pre-notification appears:
   - Small toast in top-right corner
   - Purple background with sparkle icon
   - Shows time remaining until midnight
   - Haptic feedback on mobile

2. **11:59:50 PM** - Countdown modal appears:
   - Full-screen modal with large countdown number
   - Counts down from 10 to 0
   - Neo-brutalist style with hard shadows
   - Animated number transitions

3. **Midnight (00:00:00)** - Celebration!
   - "HAPPY NEW YEAR!" message with gradient text
   - Large "2026" badge (automatically updates each year)
   - 12 fireworks bursting across screen
   - Confetti emoji animations
   - Auto-closes after 10 seconds

### Features

- ✅ **Timezone-aware**: Works correctly for all players worldwide
- ✅ **Mobile-optimized**: Includes haptic feedback
- ✅ **Accessibility-friendly**: Respects reduced-motion preferences
- ✅ **Neo-brutalist design**: Matches your brand perfectly
- ✅ **Multilingual**: Works in all 5 supported languages
- ✅ **Performance-optimized**: GPU-accelerated animations
- ✅ **State persistence**: Won't show multiple times if user refreshes

## 🚀 Integration

The feature is automatically enabled for all users and integrated into the main app layout:

```typescript
// fe-next/app/[locale]/layout.tsx
import NewYearCountdown from '@/components/celebration/NewYearCountdown';

// Added to Providers:
<NewYearCountdown />
```

## 🎨 Design Alignment

The feature follows your neo-brutalist design system:
- Hard shadows (`shadow-hard`, `shadow-hard-lg`)
- Thick borders (`border-3`, `border-4`)
- Bold colors from your palette
- Fredoka font for display text
- No blur or soft gradients
- Playful animations

## 🔧 Customization

You can disable the feature or customize behavior:

```typescript
// Disable entirely
<NewYearCountdown enabled={false} />

// Customize timing (in the hook)
useNewYearDetection({
  preCountdownMinutes: 5,        // When to show notification
  celebrationDurationMinutes: 5,  // How long to allow celebration
  enabled: true
})
```

## 📁 Files Modified/Created

### New Files
- `fe-next/hooks/useNewYearDetection.ts`
- `fe-next/components/celebration/NewYearFireworks.tsx`
- `fe-next/components/celebration/NewYearCountdown.tsx`

### Modified Files
- `fe-next/app/[locale]/layout.tsx` (added component)
- `fe-next/translations/en.js` (added newYear translations)
- `fe-next/translations/es.js` (added newYear translations)
- `fe-next/translations/he.js` (added newYear translations)
- `fe-next/translations/ja.js` (added newYear translations)
- `fe-next/translations/sv.js` (added newYear translations)

## 🎉 Ready for New Year's Eve!

The feature will automatically activate on December 31st, 2025 at 11:55 PM in each player's local timezone and create a memorable celebration experience for your players worldwide! The year badge will automatically update to show the correct upcoming year.

---

**Note**: The feature is smart enough to:
- Only show once per user session
- Reset on January 2nd
- Handle users who join during the celebration window
- Work correctly across timezones
- Respect accessibility settings

Happy New Year! 🎆
