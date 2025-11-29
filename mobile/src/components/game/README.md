# Game Components

Neo-brutalist styled game UI components for LexiClash mobile app.

## Components

### CircularTimer

A circular countdown timer with progress ring and low-time warning.

**Features:**
- Circular progress indicator using React Native SVG
- Color changes when time is low (red at ≤20 seconds)
- Pulsing animation when time is running out
- Warning badge appears when time is low
- Neo-brutalist design with hard shadows
- RTL support for Hebrew

**Props:**
```typescript
interface CircularTimerProps {
  remainingTime: number;  // Current seconds remaining
  totalTime?: number;     // Total seconds (default: 180)
}
```

**Usage:**
```typescript
import CircularTimer from '@/components/game/CircularTimer';

<CircularTimer
  remainingTime={120}
  totalTime={180}
/>
```

### GameHeader

A comprehensive game header showing timer, score, and optional round information.

**Features:**
- Animated LexiClash logo with lightning bolt
- Integrated circular timer
- Score display with animation on updates
- Optional round indicator
- Custom right content slot
- Neo-brutalist design with hard shadows
- RTL support for Hebrew
- Responsive layout for different screen sizes

**Props:**
```typescript
interface GameHeaderProps {
  remainingTime: number;        // Current seconds remaining
  totalTime?: number;           // Total seconds (default: 180)
  score: number;                // Player's current score
  round?: number;               // Current round number (optional)
  totalRounds?: number;         // Total number of rounds (optional)
  onLogoPress?: () => void;     // Callback for logo press (optional)
  rightContent?: React.ReactNode; // Custom content for right side (optional)
}
```

**Usage:**
```typescript
import GameHeader from '@/components/game/GameHeader';

// Basic usage
<GameHeader
  remainingTime={120}
  totalTime={180}
  score={45}
/>

// With rounds
<GameHeader
  remainingTime={120}
  totalTime={180}
  score={45}
  round={2}
  totalRounds={3}
  onLogoPress={() => console.log('Logo pressed')}
/>

// With custom right content
<GameHeader
  remainingTime={120}
  score={45}
  rightContent={<CustomButton />}
/>
```

## Design System

Both components follow the neo-brutalist design principles:

- **Colors**: Use COLORS constants from `@/constants/game`
- **Borders**: Bold 3-4px black borders
- **Shadows**: Hard shadows (no blur) for depth
- **Animations**: Spring-based for natural feel
- **Typography**: Heavy weights (800-900) with tight letter spacing
- **Rotation**: Slight rotation (-2° to 2°) for dynamic feel

## Translation Keys

The components use the following translation keys:

- `logo.lexi` - "Lexi" text
- `logo.clash` - "Clash" text
- `common.hurry` - Low time warning text
- `game.score` - Score label
- `game.round` - Round indicator (with ${current} and ${total} params)

All keys are available in: English, Hebrew, Swedish, Japanese

## Dependencies

- `react-native-svg` - For circular timer SVG graphics
- `react-native-reanimated` - For smooth animations
- `@/contexts/LanguageContext` - For translations and RTL support
- `@/constants/game` - For COLORS and timer constants
