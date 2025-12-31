# Mobile UX Enhancements

Comprehensive mobile optimizations for touch-first experiences in LexiClash.

## 🎯 Overview

This document describes the mobile UX enhancements implemented across the application, including:

- ✅ Swipe gestures for step-based flows
- ✅ Haptic feedback patterns
- ✅ Pull-to-refresh functionality
- ✅ Swipe-to-dismiss modals
- ✅ Mobile-optimized touch targets
- ✅ RTL language support
- ✅ Safe area insets for notched devices

---

## 📱 Features

### 1. Swipe Gestures (`useSwipeGesture`)

**Location:** `fe-next/hooks/useSwipeGesture.ts`

Generic hook for detecting swipe gestures in any direction with RTL support.

#### Features
- Horizontal swipes (left/right)
- Vertical swipes (up/down)
- RTL language support (auto-reverses horizontal directions)
- Configurable threshold
- Optional haptic feedback

#### Usage

```tsx
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useLanguage } from '@/contexts/LanguageContext';

const MyComponent = () => {
  const { dir } = useLanguage();

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    isRtl: dir === 'rtl',
    threshold: 50,
    enableHaptic: true,
  });

  return (
    <div {...swipeHandlers}>
      Swipeable content
    </div>
  );
};
```

#### Implemented In
- ✅ [OnboardingModal.tsx](../components/OnboardingModal.tsx) - 3-step onboarding
- ✅ [DailyChallengeTutorial.tsx](../components/daily/DailyChallengeTutorial.tsx) - 5-step tutorial
- ✅ [TutorialOverlay.tsx](../components/tutorial/TutorialOverlay.tsx) - In-game tutorial

---

### 2. Haptic Feedback (`hapticFeedback.ts`)

**Location:** `fe-next/utils/hapticFeedback.ts`

Centralized haptic patterns for consistent tactile feedback.

#### Available Patterns

| Pattern | Duration | Use Case |
|---------|----------|----------|
| `light` | 10ms | Light tap, selection |
| `medium` | 20ms | Navigation, toggle |
| `heavy` | 40ms | Important action |
| `success` | [20, 30, 20] | Success confirmation |
| `error` | [30, 50, 100, 50, 30] | Error notification |
| `warning` | 30ms | Warning state |
| `selection` | 15ms | Item selection |
| `swipe` | 12ms | Swipe gesture |

#### Usage

```tsx
import { triggerHaptic } from '@/utils/hapticFeedback';

// Simple pattern
triggerHaptic('success');

// Custom duration
import { triggerCustomHaptic } from '@/utils/hapticFeedback';
triggerCustomHaptic([100, 50, 100]); // vibrate-pause-vibrate
```

#### Implemented In
- ✅ OnboardingModal - Step transitions
- ✅ DailyChallengeTutorial - Step transitions
- ✅ Grid interaction - Word selection (already existed)
- ✅ All swipe gestures

---

### 3. Pull-to-Refresh (`usePullToRefresh`)

**Location:** `fe-next/hooks/usePullToRefresh.ts`

iOS-style pull-to-refresh with visual indicator.

#### Features
- Native iOS-style pull gesture
- Configurable threshold
- Resistance for natural feel
- Visual progress indicator
- Haptic feedback on trigger

#### Usage

```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';

const MyList = () => {
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      await fetchNewData();
    },
    threshold: 80,
  });

  return (
    <div {...pullToRefreshHandlers} className="overflow-y-auto relative">
      <PullToRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={80}
      />

      {/* Your scrollable content */}
    </div>
  );
};
```

#### Best For
- Leaderboards
- Daily challenge lists
- Results screens
- News feeds
- Any refreshable list

---

### 4. Swipe-to-Dismiss (`useSwipeToDismiss`)

**Location:** `fe-next/hooks/useSwipeToDismiss.ts`

Modal/overlay dismissal via swipe gesture.

#### Features
- Swipe in any direction (default: down)
- Visual feedback during drag
- Configurable threshold
- Haptic on dismiss
- Snap back if threshold not met

#### Usage

```tsx
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { motion } from 'framer-motion';

const MyModal = ({ onClose }) => {
  const { swipeToDismissHandlers, swipeState } = useSwipeToDismiss({
    onDismiss: onClose,
    direction: 'down',
    threshold: 100,
  });

  return (
    <motion.div
      {...swipeToDismissHandlers}
      style={{ transform: `translateY(${swipeState.swipeDistance}px)` }}
    >
      {/* Swipe handle indicator */}
      <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

      Modal content
    </motion.div>
  );
};
```

#### Best For
- Bottom sheets
- Modals
- Slide-up overlays
- Image viewers

---

### 5. Mobile Touch Targets (`mobileAccessibility.ts`)

**Location:** `fe-next/utils/mobileAccessibility.ts`

Utilities for WCAG-compliant touch targets.

#### Constants

```tsx
// Minimum sizes
MIN_TOUCH_TARGET_SIZE = 44; // Apple HIG
RECOMMENDED_TOUCH_TARGET_SIZE = 48; // Material Design

// Tailwind classes
TOUCH_TARGET_MIN = 'min-w-[44px] min-h-[44px]';
TOUCH_TARGET_RECOMMENDED = 'min-w-[48px] min-h-[48px]';
MOBILE_BUTTON_STYLES = 'min-h-[44px] px-4 py-3 active:scale-95';
MOBILE_ICON_BUTTON_STYLES = 'min-w-[44px] min-h-[44px] p-2 active:scale-95';
```

#### Usage

```tsx
import { MOBILE_BUTTON_STYLES } from '@/utils/mobileAccessibility';

<Button className={MOBILE_BUTTON_STYLES}>
  Tap Me
</Button>
```

#### Safe Area Insets

For devices with notches/home indicators:

```tsx
import { SAFE_AREA_PADDING } from '@/utils/mobileAccessibility';

<div className={SAFE_AREA_PADDING.bottom}>
  Content respects home indicator
</div>
```

---

## 🎨 Design Patterns

### Swipe Hint Indicators

Show users that content is swipeable:

```tsx
<div className="block sm:hidden text-center text-xs text-gray-400 mt-2">
  {t('common.swipeHint') || '← Swipe to navigate →'}
</div>
```

### Progress Dots

Visual indicator for multi-step flows:

```tsx
<div className="flex justify-center gap-2">
  {Array.from({ length: totalSteps }).map((_, i) => (
    <div
      key={i}
      className={`h-2 rounded-full transition-all ${
        i === currentStep ? 'w-8 bg-neo-purple' : 'w-2 bg-gray-300'
      }`}
    />
  ))}
</div>
```

### Swipe Handle

Visual affordance for swipe-to-dismiss:

```tsx
<div className="flex justify-center mb-4">
  <div className="w-12 h-1 bg-gray-300 rounded-full" />
</div>
```

---

## 🌍 RTL Support

All swipe gestures automatically support RTL languages:

```tsx
const { dir } = useLanguage();

const swipeHandlers = useSwipeGesture({
  onSwipeLeft: handleNext,
  onSwipeRight: handlePrev,
  isRtl: dir === 'rtl', // Automatically reverses directions
});
```

In RTL mode:
- Swipe left = Previous
- Swipe right = Next

In LTR mode:
- Swipe left = Next
- Swipe right = Previous

---

## 📊 Performance Considerations

### Grid Interaction Optimizations

Already implemented in [useGridInteraction.ts](../components/grid/useGridInteraction.ts):

- ✅ RAF throttling for low-end devices
- ✅ Grid measurement caching
- ✅ Velocity tracking
- ✅ Touch history optimization

### Best Practices

1. **Prevent Default Carefully**
   ```tsx
   if (e.cancelable) {
     e.preventDefault(); // Only if cancellable
   }
   ```

2. **Passive Event Listeners**
   ```tsx
   element.addEventListener('touchmove', handler, { passive: false });
   ```

3. **Cleanup**
   ```tsx
   useEffect(() => {
     return () => {
       // Clean up refs, timers, etc.
     };
   }, []);
   ```

---

## 🧪 Testing

### Demo Component

See complete working examples in:
`fe-next/components/examples/MobileEnhancementsDemo.tsx`

This component demonstrates:
- All swipe patterns
- Haptic feedback variations
- Pull-to-refresh
- Swipe-to-dismiss modal
- Mobile-optimized buttons

### Manual Testing Checklist

- [ ] Test on actual mobile device (not just browser devtools)
- [ ] Verify haptic feedback (some browsers don't support it)
- [ ] Test RTL mode (Arabic, Hebrew)
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify touch targets are 44px minimum
- [ ] Test with large text settings
- [ ] Test landscape orientation
- [ ] Test on devices with notches

---

## 📝 Translation Keys

Add these to your translation files:

```json
{
  "onboarding": {
    "swipeHint": "← Swipe to navigate →"
  },
  "tutorial": {
    "swipeHint": "← Swipe to navigate →"
  },
  "common": {
    "swipeHint": "← Swipe to navigate →",
    "pullToRefresh": "Pull to refresh",
    "swipeToDismiss": "Swipe down to close"
  }
}
```

---

## 🚀 Future Enhancements

Potential additions:

- [ ] Pinch-to-zoom for images
- [ ] Long-press menus
- [ ] Shake to undo
- [ ] Tilt interactions
- [ ] Voice control
- [ ] Gesture customization settings
- [ ] Accessibility mode toggle

---

## 📚 References

- [Apple Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures)
- [Material Design - Touch Targets](https://m3.material.io/foundations/interaction/gestures)
- [WCAG 2.1 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Web Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

---

## 🤝 Contributing

When adding new mobile features:

1. Follow existing patterns
2. Support RTL languages
3. Add haptic feedback where appropriate
4. Ensure 44px minimum touch targets
5. Test on real devices
6. Update this documentation
