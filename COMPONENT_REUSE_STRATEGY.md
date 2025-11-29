# Component Reuse Strategy: Web (fe-next) ↔ Mobile

## Overview
This document outlines how we reuse components, design system, and logic between the web app (`fe-next`) and mobile app (`mobile`).

## Design System - SHARED ✅

### Colors (Neo-Brutalist Palette)
**Source of Truth**: `fe-next/app/globals.css` (CSS variables)
**Mobile Implementation**: `mobile/src/constants/game.ts` (COLORS object)

```typescript
// Both use the same hex values:
neoYellow: '#FFE135'
neoCyan: '#00FFFF'
neoPink: '#FF1493'
neoNavy: '#1a1a2e'
// ... etc
```

### Typography
- **Web**: Fredoka (display), Rubik (body)
- **Mobile**: Should use same fonts via `expo-font` or system fallbacks

### Spacing & Layout
- **Hard shadows**: No blur, solid black offsets (4px 4px 0px)
- **Border radius**: Chunky neo-brutalist (4px, 8px, 12px)
- **Border width**: 3px-4px thick borders

## Components - Categorized by Reusability

### ✅ Fully Reusable (Logic-only, Platform-agnostic)

These components contain business logic that can be shared 100%:

1. **Contexts**:
   - `LanguageContext` - ✅ Already ported to mobile
   - `SocketContext` - ✅ Already ported to mobile
   - `AuthContext` - Can be shared
   - `MusicContext` / `AudioContext` - Different implementations (Web Audio API vs Expo AV)
   - `SoundEffectsContext` - Different implementations

2. **Utilities/Hooks**:
   - Translation logic (`useLanguage`)
   - Socket event handlers
   - Game state management logic
   - Achievement calculation logic

### 🔄 Adaptable (Same UI, Different Implementation)

These components have the same visual design but need platform-specific rendering:

**Current Web Components** → **Mobile Equivalent**:

1. **Game Components**:
   - `GridComponent.jsx` → Needs React Native View/TouchableOpacity
   - `SlotMachineGrid.jsx` → Needs React Native Animated API
   - `CircularTimer.jsx` → Needs React Native SVG
   - `GameHeader.jsx` → Can adapt to React Native

2. **UI Components** (from `/components/ui/`):
   - `button.jsx` → TouchableOpacity + styling
   - `card.jsx` → View + styling
   - `badge.jsx` → View + Text
   - `input.jsx` → TextInput
   - `dialog.jsx` → Modal
   - `alert.jsx` → React Native alert or custom component

3. **Feature Components**:
   - `AchievementBadge.jsx` → Adaptable
   - `Avatar.jsx` → Image component
   - `RoomChat.jsx` → ScrollView + TextInput
   - `GameTypeSelector.jsx` → Picker or custom

### ❌ Web-Only (Not Applicable to Mobile)

Components that don't make sense on mobile:

1. `Footer.jsx` - Web navigation footer
2. `Header.jsx` - Web header withnavigation
3. SEO-related components
4. Desktop-specific layouts

### 📱 Mobile-Only

Components that only exist on mobile:

1. Native navigation (expo-router)
2. Mobile-specific gestures (PanGestureHandler for grid)
3. Device-specific features (haptics, notifications)

## Recommended Approach Going Forward

### Option 1: Shared Package (Ideal for larger scale)
```
/packages
  /shared
    /constants
      colors.ts        # Shared color palette
      game.ts          # Game constants
    /logic
      achievements.ts  # Achievement calculations
      scoring.ts       # Scoring logic
      validation.ts    # Word validation
    /types
      game.d.ts        # Shared TypeScript types
```

Then:
- `fe-next` imports from `@boggle/shared`
- `mobile` imports from `@boggle/shared`

### Option 2: Copy + Sync (Current approach, simpler)
- Keep web and mobile separate
- Manually sync design tokens (colors, spacing)
- Copy business logic when needed
- **This is what we're doing now**

## Current Status

### ✅ Already Synchronized:
1. **Colors** - Mobile COLORS now matches web globals.css exactly
2. **LanguageContext** - Ported with React Native compatibility
3. **SocketContext** - Ported with socket.io-client
4. **Game constants** - Difficulties, languages, etc.

### 🔜 Next Steps for Component Reuse:

1. **Create shared translation files**:
   - Move `fe-next/translations/` to shared location
   - Both apps import from same source

2. **Extract business logic**:
   - Achievement calculations
   - Scoring engine
   - Word validation
   - Game state management

3. **Adapt key UI components**:
   - Start with `GridComponent` - most important
   - Then `CircularTimer`, `GameHeader`
   - Shared visual design, platform-specific rendering

4. **Share assets**:
   - Fonts (Fredoka, Rubik)
   - Sound effects
   - Music tracks
   - Achievement icons

## Guidelines for New Components

### When Creating New Features:

1. **Think shared-first**: Can this logic be platform-agnostic?
2. **Separate concerns**: Business logic vs UI rendering
3. **Use same naming**: If web has `GameHeader`, mobile should too
4. **Match design system**: Use COLORS constants, not hardcoded hex
5. **Document differences**: If mobile differs from web, note why

### Example Pattern:

```typescript
// shared/logic/achievements.ts (platform-agnostic)
export function calculateAchievements(playerStats) {
  // Pure logic, works anywhere
}

// fe-next/components/AchievementBadge.jsx (web)
import { calculateAchievements } from '@/shared/logic/achievements';
export function AchievementBadge() {
  return <div className="badge">...</div>
}

// mobile/src/components/AchievementBadge.tsx (mobile)
import { calculateAchievements } from '../shared/logic/achievements';
export function AchievementBadge() {
  return <View style={styles.badge}>...</View>
}
```

## Summary

✅ **DO** reuse:
- Color palette (already done)
- Business logic (achievements, scoring, validation)
- Constants (grid sizes, difficulties, etc.)
- Translation files
- Asset files (fonts, sounds, images)
- Context logic (auth, language, socket events)

🔄 **ADAPT** for each platform:
- UI components (same visual design, different rendering)
- Animations (CSS vs React Native Animated)
- Navigation (Next.js router vs expo-router)
- Audio (Web Audio API vs Expo AV)

❌ **DON'T** try to share:
- Platform-specific features
- Different user flows (web might have more features)
- Build configuration

---

**Last Updated**: 2025-11-29
**Web App**: `fe-next/`
**Mobile App**: `mobile/`
