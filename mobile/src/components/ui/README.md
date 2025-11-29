# Neo-Brutalist UI Components - React Native

React Native ports of the web UI components from `fe-next/components/ui/` with matching neo-brutalist visual design.

## Overview

These components maintain the same visual style as the web version:
- Thick borders (2-4px)
- Hard shadows (no blur)
- Bold colors from `COLORS` constants
- Pill-shaped elements for badges/progress
- Clean, chunky aesthetic

## Components

### Card

Cards with thick borders and hard shadows. Supports tilt and dark variants.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card tilt="left">
  <CardHeader>
    <CardTitle>Game Settings</CardTitle>
    <CardDescription>Configure your game options</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Your content here */}
  </CardContent>
  <CardFooter>
    {/* Footer content */}
  </CardFooter>
</Card>

// Dark variant
<CardDark>
  <CardHeader>
    <CardTitle>Dark Card</CardTitle>
  </CardHeader>
</CardDark>
```

**Props:**
- `tilt?: 'left' | 'right'` - Adds playful rotation
- `variant?: 'default' | 'dark'` - Color scheme
- `style?: ViewStyle` - Custom styles

### Badge

Pill-shaped badges with bold colors and thick borders.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="default">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="accent">Featured</Badge>
<Badge variant="cyan">Special</Badge>
<Badge variant="purple">Rare</Badge>
```

**Props:**
- `variant?: BadgeVariant` - Color scheme (default, secondary, destructive, outline, success, accent, cyan, purple)
- `style?: ViewStyle` - Custom container styles
- `textStyle?: TextStyle` - Custom text styles

**Variants:**
- `default` - Yellow (neoYellow)
- `secondary` - Orange (neoOrange)
- `destructive` - Red (neoRed)
- `outline` - Cream (neoCream)
- `success` - Lime (neoLime)
- `accent` - Pink (neoPink)
- `cyan` - Cyan (neoCyan)
- `purple` - Purple (neoPurple)

### Input

Text input with thick borders and inset shadow effect.

```tsx
import { Input, inputVariants } from '@/components/ui';
import { useState } from 'react';

const [username, setUsername] = useState('');
const [isFocused, setIsFocused] = useState(false);

<Input
  value={username}
  onChangeText={setUsername}
  placeholder="Enter username"
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  style={isFocused ? inputVariants.focused : undefined}
/>

// Disabled state
<Input
  value={username}
  editable={false}
  style={inputVariants.disabled}
/>

// Error state
<Input
  value={username}
  style={inputVariants.error}
/>
```

**Props:**
- All standard `TextInputProps`
- `containerStyle?: ViewStyle` - Custom container styles

**Variants (in `inputVariants`):**
- `disabled` - Reduced opacity
- `error` - Red border
- `focused` - Cyan border with enhanced shadow

### Progress

Progress bar with animated fill and thick borders.

```tsx
import { Progress } from '@/components/ui';

<Progress value={75} variant="default" size="default" />
<Progress value={100} variant="success" size="lg" />
<Progress value={50} variant="warning" size="sm" />
<Progress value={25} variant="danger" animated={false} />
```

**Props:**
- `value: number` - Progress value (0-100)
- `variant?: ProgressVariant` - Color scheme (default, success, warning, danger, accent, cyan)
- `size?: ProgressSize` - Height (sm: 12px, default: 20px, lg: 28px)
- `style?: ViewStyle` - Custom styles
- `animated?: boolean` - Enable smooth animation (default: true)

**Variants:**
- `default` - Yellow (neoYellow)
- `success` - Lime (neoLime)
- `warning` - Orange (neoOrange)
- `danger` - Red (neoRed)
- `accent` - Pink (neoPink)
- `cyan` - Cyan (neoCyan)

## Color Palette

All components use colors from `/mobile/src/constants/game.ts`:

```typescript
COLORS = {
  neoYellow: '#FFE135',
  neoOrange: '#FF6B35',
  neoPink: '#FF1493',
  neoPurple: '#4a1c6a',
  neoNavy: '#1a1a2e',
  neoCyan: '#00FFFF',
  neoLime: '#BFFF00',
  neoRed: '#FF3366',
  neoCream: '#FFFEF0',
  neoBlack: '#000000',
  neoWhite: '#FFFFFF',
  neoGray: '#2d2d44',
}
```

## Design Philosophy

These components follow the **Neo-Brutalist** design style:

1. **Thick Borders**: 2-4px borders for chunky feel
2. **Hard Shadows**: No blur, solid offset shadows
3. **Bold Colors**: High contrast, vibrant colors
4. **Simple Shapes**: Rectangles with rounded corners, pill shapes
5. **No Gradients**: Flat, solid colors only
6. **Uppercase Text**: Badges and titles in uppercase
7. **Heavy Font Weights**: Font weight 900 (black) for emphasis

## TypeScript Support

All components are fully typed with TypeScript:
- Interface definitions for all props
- Type exports for variants
- Proper forwarding of refs where applicable

## Differences from Web Version

### Card
- Uses React Native `View` instead of `div`
- Shadow implemented with `shadowColor`, `shadowOffset`, etc.
- Tilt uses `transform: [{ rotate }]` instead of CSS

### Badge
- No focus ring (not applicable in React Native)
- Variants implemented as StyleSheet objects instead of class-variance-authority

### Input
- Uses `TextInput` instead of HTML `input`
- Focus state managed manually with `onFocus`/`onBlur`
- File input features removed (not applicable)

### Progress
- Uses `Animated.View` instead of Radix UI
- Smooth animations with React Native Animated API
- No dependency on external libraries

## Example Screen

```tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Progress
} from '@/components/ui';

export default function ExampleScreen() {
  const [username, setUsername] = useState('');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <View style={{ padding: 16, gap: 16 }}>
        <Card>
          <CardHeader>
            <CardTitle>Player Stats</CardTitle>
            <CardDescription>Your game statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="success">Online</Badge>
            <Progress value={75} variant="success" style={{ marginTop: 16 }} />
          </CardContent>
        </Card>

        <Card tilt="right">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
            />
          </CardContent>
          <CardFooter>
            <Badge variant="cyan">Premium</Badge>
          </CardFooter>
        </Card>
      </View>
    </ScrollView>
  );
}
```

## Migration from Web

If porting a component from `fe-next`, follow these patterns:

1. **Import from constants**: Use `COLORS` from `@/constants/game`
2. **Replace HTML elements**: `div` → `View`, `input` → `TextInput`, `h3` → `Text`
3. **Style objects**: Convert Tailwind classes to StyleSheet objects
4. **Shadows**: Use React Native shadow props instead of CSS box-shadow
5. **Borders**: Use `borderWidth`, `borderColor` instead of CSS border
6. **Remove web-specific**: Focus rings, hover states, CSS transitions

## Future Enhancements

- [ ] Add haptic feedback for interactive components
- [ ] Add accessibility props (accessibilityLabel, etc.)
- [ ] Add Pressable wrapper for Card (optional)
- [ ] Add loading state for Input
- [ ] Add icon support for Badge
- [ ] Add label variants for Progress (with percentage text)
