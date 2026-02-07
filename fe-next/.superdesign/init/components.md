# LexiClash UI Components

## Overview
52 UI components in `components/ui/` following Neo-Brutalist design system.

---

## Core Components

### EnhancedButton (`EnhancedButton.tsx`)
Primary button component with Neo-Brutalist styling.

**Props:**
- `variant`: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'accent' | 'cyan' | 'gradient'
- `size`: 'default' | 'sm' | 'lg' | 'xl' | '2xl' | 'icon' | 'icon-lg' | 'icon-xl'
- `isLoading`, `isSuccess`, `isError`: State indicators
- `leftIcon`, `rightIcon`: Icon elements
- `haptic`: Enable haptic feedback
- `animation`: 'none' | 'pop' | 'wobble' | 'shake'

**Key Styles:**
```tsx
// Base styles
'border-3 border-neo-black rounded-neo shadow-hard'
'min-h-[48px] min-w-[48px]' // Touch target
'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg'
'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed'
```

**Variants:**
- `default`: bg-neo-lime text-neo-black
- `secondary`: bg-neo-pink text-neo-black
- `destructive`: bg-neo-red text-neo-black
- `cyan`: bg-neo-cyan text-neo-black
- `gradient`: bg-gradient-to-r from-neo-pink via-neo-orange to-neo-yellow

---

### EnhancedCard (`EnhancedCard.tsx`)
Card container with hover lift effect.

**Props:**
- `isInteractive`: Enable hover/press animations
- `isLoading`: Show skeleton state
- `elevation`: 'flat' | 'default' | 'raised' | 'floating'
- `borderColor`: 'default' | 'primary' | 'secondary' | 'accent' | 'none'
- `bgVariant`: 'default' | 'gradient' | 'transparent'

**Sub-components:**
- `CardHeader` - Header section with alignment
- `CardTitle` - Heading with size variants
- `CardDescription` - Muted description text
- `CardContent` - Main content area
- `CardFooter` - Footer with alignment
- `CardBadge` - Status badge

**Key Styles:**
```tsx
// Base
'rounded-neo-lg border-4'
// Interactive hover
{ y: -4, scale: 1.02 }
// Press
{ scale: 0.98, y: 0 }
```

---

### NeoLoader (`NeoLoader.tsx`)
Loading animation component.

**Variants:**
- `letters`: Bouncing LEXICLASH letter tiles
- `mascot`: Animated mascot character
- `dots`: Simple bouncing dots
- `mascot-letters`: Mascot inside spinning ring

**Props:**
- `text`: Optional loading text
- `size`: 'sm' | 'md' | 'lg'
- `variant`: Animation variant
- `mascotVariant`: Mascot expression

---

### Dialog (`dialog.tsx`)
Modal dialog using Radix UI.

**Components:**
- `Dialog`, `DialogTrigger`, `DialogPortal`
- `DialogOverlay` - Semi-transparent backdrop
- `DialogContent` - Centered content with Neo-Brutalist styling
- `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`

**Key Styles:**
```tsx
// Overlay
'bg-black/80 backdrop-blur-sm'
// Content
'border-4 border-neo-black bg-neo-cream dark:bg-neo-navy'
'shadow-hard-xl'
```

---

## Input Components

### Input (`input.tsx`)
Text input with Neo-Brutalist styling.

**Styles:**
```tsx
'border-3 border-neo-black rounded-neo shadow-hard-sm'
'bg-neo-cream dark:bg-neo-navy-light'
'focus:ring-2 focus:ring-neo-cyan'
```

### ValidatedInput (`ValidatedInput.tsx`)
Input with validation state indicators.

### FormField (`FormField.tsx`)
Form field wrapper with label and error display.

### Textarea (`textarea.tsx`)
Multi-line text input.

### Select (`select.tsx`)
Dropdown select using Radix UI.

### Checkbox (`checkbox.tsx`)
Checkbox with Neo-Brutalist styling.

### Switch (`switch.tsx`)
Toggle switch component.

---

## Display Components

### Badge (`badge.tsx`)
Status badge with variants.

**Variants:**
- `default`, `secondary`, `destructive`, `outline`

### GameBadge (`GameBadge.tsx`)
Game-specific badge with tier colors.

### Stat (`Stat.tsx`)
Single statistic display.

### StatBadge (`StatBadge.tsx`)
Stat with trend indicator.

### AnimatedCounter (`AnimatedCounter.tsx`)
Animated number counter.

### Progress (`progress.tsx`)
Progress bar component.

---

## Layout Components

### Tabs (`tabs.tsx`)
Tab navigation using Radix UI.

### CollapsibleSection (`CollapsibleSection.tsx`)
Expandable section with header.

### CollapsiblePanel (`CollapsiblePanel.tsx`)
Panel version of collapsible.

### Collapsible (`Collapsible.tsx`)
Base collapsible using Radix.

### WizardStep (`WizardStep.tsx`)
Multi-step wizard component.

---

## Feedback Components

### Tooltip (`tooltip.tsx`)
Tooltip using Radix UI.

### MobileTooltip (`MobileTooltip.tsx`)
Touch-friendly tooltip.

### Alert (`alert.tsx`)
Alert message display.

### AlertDialog (`alert-dialog.tsx`)
Confirmation dialog.

### ConfirmationDialog (`ConfirmationDialog.tsx`)
Action confirmation modal.

### EnhancedToast (`EnhancedToast.tsx`)
Toast notification.

---

## Mascot Components

### Mascot (`Mascot.tsx`)
Base mascot component.

**Props:**
- `variant`: 'happy' | 'sad' | 'excited' | 'thinking' | etc.
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `animated`: Enable animation

### MascotVideo (`MascotVideo.tsx`)
Video mascot animations.

### InteractiveMascot (`InteractiveMascot.tsx`)
Click/hover responsive mascot.

### IdleMascot (`IdleMascot.tsx`)
Idle animation mascot.

### CelebrationMascot (`CelebrationMascot.tsx`)
Victory celebration mascot.

### DJMascot (`DJMascot.tsx`)
Music-themed mascot.

---

## Specialized Components

### GameModeIcon (`GameModeIcon.tsx`)
Icons for game modes (singleplayer, multiplayer, brain, daily).

### CoinBalanceBadge (`CoinBalanceBadge.tsx`)
Player coin display.

### TactileButton (`TactileButton.tsx`)
Button with enhanced tactile feedback.

### DecorativeCard (`DecorativeCard.tsx`)
Card with decorative elements.

### EmptyState (`EmptyState.tsx`)
Empty state placeholder.

### EnhancedEmptyState (`EnhancedEmptyState.tsx`)
Empty state with mascot.

### EnhancedLoading (`EnhancedLoading.tsx`)
Full-page loading state.

### PageLoader (`PageLoader.tsx`)
Page-level loading indicator.

### PlayfulBackground (`PlayfulBackground.tsx`)
Animated background decoration.

### Skeleton (`skeleton.tsx`)
Loading skeleton shapes.

### EducationSkeletons (`EducationSkeletons.tsx`)
Education-specific loading skeletons.

---

## PullToRefresh Components

### PullToRefreshWrapper (`PullToRefreshWrapper.tsx`)
Pull-to-refresh container.

### PullToRefreshIndicator (`PullToRefreshIndicator.tsx`)
Refresh indicator display.

---

## Design Patterns

### Common Prop Patterns
```tsx
// Size variants
size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Color variants using theme colors
variant?: 'default' | 'lime' | 'pink' | 'cyan' | 'purple'

// Interactive states
isLoading?: boolean
isDisabled?: boolean
isSuccess?: boolean
isError?: boolean

// Animation control
animated?: boolean
reduceMotion?: boolean
```

### Styling Patterns
```tsx
// Use cn() utility for class merging
import { cn } from '@/lib/utils';

// CVA for variant styling
import { cva, type VariantProps } from 'class-variance-authority';

// Forward refs for all components
const Component = React.forwardRef<HTMLElement, Props>((props, ref) => {
  // ...
});
Component.displayName = 'Component';
```
