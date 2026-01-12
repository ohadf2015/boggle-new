# Mascot Animation Guide

Complete guide for using Lexi, the LexiClash mascot, with all available animations and idle activities.

## Components Overview

### 1. `<Mascot />` - Basic Static Mascot
Simple mascot with built-in idle animation.

```tsx
import { Mascot } from '@/components/ui/Mascot';

<Mascot variant="happy" size="lg" animated />
```

### 2. `<InteractiveMascot />` - Interactive with Hover/Click
Mascot that changes state on user interaction.

```tsx
import InteractiveMascot from '@/components/ui/InteractiveMascot';

<InteractiveMascot
  variant="thinking"
  enableHover
  enableClick
  hoverVariant="excited"
  clickVariant="celebrating"
  clickAnimation="bounce"
  tooltip="Click me!"
  onClick={() => console.log('Mascot clicked!')}
/>
```

### 3. `<IdleMascot />` - Random Activity Animations (NEW!)
Mascot that automatically performs fun activities during idle time.

```tsx
import IdleMascot from '@/components/ui/IdleMascot';

// Basic usage - shows random activities every 10-30 seconds
<IdleMascot baseVariant="happy" size="xl" />

// Custom activities and timing
<IdleMascot
  baseVariant="encouraging"
  activities={['eating_pizza', 'playing_ball', 'gaming', 'dancing']}
  minInterval={15000}  // 15 seconds min
  maxInterval={45000}  // 45 seconds max
  activityDuration={5000}  // Show activity for 5 seconds
  size="lg"
  enableHover
  enableClick
/>
```

## Available Variants

### Base Emotional Variants
- `happy` - Default cheerful state
- `encouraging` - Motivating, pointing gesture
- `thinking` - Contemplative, head tilted
- `oops` - Nervous, mistakes happened
- `celebrating` - Party mode!
- `victory` - Triumphant with crown
- `focused` - Concentrated, determined
- `surprised` - Shocked, wide eyes
- `sleepy` - Tired, low energy
- `excited` - High energy bounce
- `pointing` - Directional guidance

### Activity Variants (Fun Animations!)
- `eating_pizza` 🍕 - Munching on a slice
- `drinking_coffee` ☕ - Enjoying a cozy drink
- `reading` 📚 - Absorbed in a book
- `gaming` 🎮 - Intense gameplay
- `dancing` 💃 - Groovy dance moves
- `sleeping` 😴 - Peaceful slumber
- `waving` 👋 - Friendly greeting
- `thumbs_up` 👍 - Approval gesture
- `holding_trophy` 🏆 - Victory celebration
- `typing` ⌨️ - Focused work
- `cheering` 📣 - Enthusiastic support
- `training` 💪 - Workout mode
- **`playing_ball` ⚽ - Bouncing a ball (NEW!)**
- **`skateboarding` 🛹 - Riding a skateboard (NEW!)**
- **`juggling` 🤹 - Juggling colorful balls (NEW!)**

## Usage Examples

### Loading States
```tsx
<IdleMascot
  baseVariant="thinking"
  activities={['drinking_coffee', 'reading']}
  size="lg"
/>
```

### Waiting Screens
```tsx
<IdleMascot
  baseVariant="happy"
  activities={['eating_pizza', 'gaming', 'playing_ball']}
  size="xl"
  enableClick
  onClick={triggerSomeFun}
/>
```

### Error Pages
```tsx
<InteractiveMascot
  variant="oops"
  hoverVariant="thinking"
  clickVariant="surprised"
  size="2xl"
  tooltip={t('clickForHelp')}
/>
```

### Success/Celebration
```tsx
<IdleMascot
  baseVariant="celebrating"
  activities={['dancing', 'cheering', 'holding_trophy']}
  activityDuration={6000}
  size="xl"
/>
```

## Size Options
- `xs` - 40x40px (10x10 in Tailwind)
- `sm` - 64x64px (16x16)
- `md` - 96x96px (24x24) - Default
- `lg` - 128x128px (32x32)
- `xl` - 160x160px (40x40)
- `2xl` - 192x192px (48x48)

## Click Animation Options
When using `<InteractiveMascot />`:
- `bounce` - Vertical bounce (default)
- `spin` - 360° rotation
- `shake` - Horizontal shake
- `pop` - Scale pop effect
- `wiggle` - Playful wiggle

## Performance & Accessibility
All mascot components respect:
- `prefersReducedMotion` - Disables animations for accessibility
- Device performance - Simplifies animations on low-end devices
- Keyboard navigation - Full keyboard support with Tab/Enter/Space

## Default Idle Activities
If you don't specify activities, `IdleMascot` uses these by default:
```ts
[
  'eating_pizza',
  'drinking_coffee',
  'gaming',
  'dancing',
  'playing_ball',
  'skateboarding',
  'juggling',
  'waving',
  'thumbs_up',
]
```

## Generating New Mascot Images

If you need to create new activity variants:

1. **Generate the image** using the image generation tool
2. **Remove background** automatically:
   ```bash
   python3 scripts/remove_mascot_bg.py --process-temp
   ```
3. **Add to types** in `components/ui/Mascot.tsx`:
   ```ts
   export type MascotVariant =
     | 'existing_variants'
     | 'your_new_variant';
   ```
4. **Add image path** to `MASCOT_IMAGES`:
   ```ts
   your_new_variant: '/mascot/lexi-your-new-variant.png',
   ```
5. **Add animation** in both Mascot.tsx and InteractiveMascot.tsx

## Best Practices

1. **Choose appropriate variants for context**
   - Loading: `thinking`, `focused`
   - Success: `celebrating`, `victory`
   - Error: `oops`, `surprised`
   - Waiting: Use `IdleMascot` with fun activities

2. **Size guidelines**
   - Small UI elements: `sm` or `md`
   - Main content area: `lg` or `xl`
   - Hero sections: `xl` or `2xl`

3. **Idle activities timing**
   - Short wait (< 30s): Disable idle activities
   - Medium wait (30s-2min): 15-30s intervals
   - Long wait (> 2min): 10-20s intervals with longer durations

4. **Performance**
   - Limit to 1-2 mascots per page
   - Use `priority` prop for above-the-fold mascots
   - Disable complex animations on mobile if needed

## Migration from Basic Mascot

### Before:
```tsx
<Mascot variant="happy" size="lg" />
```

### After (with idle activities):
```tsx
<IdleMascot
  baseVariant="happy"
  size="lg"
  enableIdleActivities
/>
```

## Hook Usage (Advanced)

For custom implementations, use the hook directly:

```tsx
import { useRandomMascotActivity } from '@/hooks/useRandomMascotActivity';

const MyComponent = () => {
  const { currentVariant, triggerActivity, isDoingActivity } = useRandomMascotActivity({
    baseVariant: 'happy',
    activities: ['gaming', 'dancing'],
    minInterval: 20000,
    maxInterval: 60000,
  });

  return (
    <InteractiveMascot
      variant={currentVariant}
      onClick={triggerActivity}
    />
  );
};
```
