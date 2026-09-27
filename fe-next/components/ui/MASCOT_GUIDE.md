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
- `happy` - Default cheerful state ✨ **Animated GIF**
- `encouraging` - Motivating, pointing gesture
- `thinking` - Contemplative, head tilted ✨ **Animated GIF**
- `oops` - Nervous, mistakes happened ✨ **Animated GIF**
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
- `gaming` 🎮 - Intense gameplay ✨ **Animated GIF**
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

## Animated GIF Variants

Some mascot variants use **animated GIF files** for enhanced visual appeal, while others use static PNG images with CSS animations. The system automatically selects the correct format.

### GIF-Enabled Variants
The following variants use real animated GIF files (background-removed, optimized):

- **`happy`** ✨ - Happy/idle state (main.gif)
  - Default cheerful mascot animation
  - Best for: landing pages, waiting states, general usage

- **`gaming`** ✨ - Gaming/excited gameplay (play.gif)
  - Intense gameplay animation
  - Best for: game screens, competitive modes, achievement celebrations

- **`thinking`** ✨ - Thinking/focused states (study.gif)
  - Contemplative animation with head movement
  - Best for: loading screens, processing states, brain training modes

- **`oops`** ✨ - Errors/mistakes (oops.gif)
  - Nervous/apologetic animation
  - Best for: error pages, validation failures, "try again" states

### How It Works

The mascot system automatically detects GIF variants and handles them correctly:

```tsx
// You use the same API - the system handles GIF vs PNG automatically
<Mascot variant="happy" />  // Renders main-nobg.gif
<Mascot variant="celebrating" />  // Renders lexi-celebrating.png
```

**Technical Details:**
- `getMascotImagePath(variant)` - Returns correct path (GIF or PNG)
- `isGifVariant(variant)` - Returns true for GIF variants
- `GIF_VARIANTS` - Set containing: `'happy'`, `'gaming'`, `'thinking'`, `'oops'`
- Next.js Image component automatically uses `unoptimized={true}` for GIFs

### GIF Optimization

All GIF mascots are:
- **Background-removed** - Transparent backgrounds for Neo-Brutalist dark theme
- **Optimized** - Target file size < 500KB for fast loading
- **Frame-preserved** - Original animation timing and smoothness maintained
- **High-quality** - Lossy compression (80%) balances size and quality

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

### For PNG Mascots (Static with CSS Animations)

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

### For GIF Mascots (Animated GIF Files)

If you need to process new animated GIF mascots:

1. **Place GIF file** in `public/mascot/` directory (e.g., `new-animation.gif`)
2. **Remove background** using the GIF processing script:
   ```bash
   # Process single GIF
   python3 scripts/remove_gif_background.py public/mascot/new-animation.gif

   # Or batch process all GIFs in directory
   python3 scripts/remove_gif_background.py --batch public/mascot/
   ```
3. **Optimize the processed GIF**:
   ```bash
   # Single file
   python3 scripts/optimize_processed_gifs.py public/mascot/new-animation-nobg.gif

   # Or batch optimize
   python3 scripts/optimize_processed_gifs.py --batch public/mascot/
   ```
4. **Add to GIF_VARIANTS Set** in `components/ui/Mascot.tsx`:
   ```ts
   export const GIF_VARIANTS = new Set<MascotVariant>([
     'happy',
     'gaming',
     'thinking',
     'oops',
     'your_new_variant',  // Add here
   ]);
   ```
5. **Add GIF mapping** in `getMascotImagePath()`:
   ```ts
   if (GIF_VARIANTS.has(variant)) {
     const gifMap: Record<string, string> = {
       'happy': '/mascot/main-nobg.gif',
       'gaming': '/mascot/play-nobg.gif',
       'thinking': '/mascot/study-nobg.gif',
       'oops': '/mascot/oops-nobg.gif',
       'your_new_variant': '/mascot/new-animation-nobg.gif',  // Add here
     };
     return gifMap[variant] || MASCOT_IMAGES[variant];
   }
   ```
6. **Test the GIF**:
   ```tsx
   <Mascot variant="your_new_variant" size="lg" />
   ```

**Note:** GIF processing is computationally intensive (5-10 minutes per file). The script:
- Extracts all frames from the GIF
- Removes background from each frame individually using AI (rembg)
- Reconstructs the GIF with preserved timing and metadata
- Creates automatic backups (`.gif.backup`)

For more details, see the `/remove-bg-gif` skill or `.claude/skills/remove-bg-gif/SKILL.md`.

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
