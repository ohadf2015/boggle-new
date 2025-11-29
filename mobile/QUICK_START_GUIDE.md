# Quick Start Guide - New Mobile Components

## Files Created

### Components (3)
1. `/mobile/src/components/game/GameTypeSelector.tsx` - Game mode selector
2. `/mobile/src/components/profile/Avatar.tsx` - Avatar display
3. `/mobile/src/components/profile/EmojiAvatarPicker.tsx` - Avatar picker modal

### Supporting Files (5)
4. `/mobile/src/components/profile/ExampleUsage.tsx` - Usage examples
5. `/mobile/src/components/profile/README.md` - Documentation
6. `/mobile/src/components/profile/index.ts` - Exports
7. `/mobile/src/components/game/index.ts` - Exports (updated)
8. `/mobile/COMPONENT_PORT_SUMMARY.md` - Full documentation

---

## Import & Use

### GameTypeSelector
```typescript
import { GameTypeSelector } from '@/components/game';

// In your Host screen
const [gameType, setGameType] = useState<'regular' | 'tournament'>('regular');
const [tournamentRounds, setTournamentRounds] = useState(3);

<GameTypeSelector
  gameType={gameType}
  setGameType={setGameType}
  tournamentRounds={tournamentRounds}
  setTournamentRounds={setTournamentRounds}
/>
```

### Avatar
```typescript
import { Avatar } from '@/components/profile';

// Show player avatar
<Avatar
  profilePictureUrl={player.profilePicture}
  avatarEmoji={player.avatarEmoji || '🐶'}
  avatarColor={player.avatarColor || '#4ECDC4'}
  size="md"
/>
```

### EmojiAvatarPicker
```typescript
import { Avatar, EmojiAvatarPicker } from '@/components/profile';

const [isPickerOpen, setIsPickerOpen] = useState(false);
const [avatarEmoji, setAvatarEmoji] = useState('🐶');
const [avatarColor, setAvatarColor] = useState('#4ECDC4');

// Avatar with edit button
<TouchableOpacity onPress={() => setIsPickerOpen(true)}>
  <Avatar avatarEmoji={avatarEmoji} avatarColor={avatarColor} size="lg" />
</TouchableOpacity>

// Picker modal
<EmojiAvatarPicker
  isOpen={isPickerOpen}
  onClose={() => setIsPickerOpen(false)}
  onSave={({ emoji, color }) => {
    setAvatarEmoji(emoji);
    setAvatarColor(color);
  }}
  currentEmoji={avatarEmoji}
  currentColor={avatarColor}
/>
```

---

## Key Features

### All Components
- TypeScript with full type safety
- Neo-brutalist design (hard shadows, bold borders)
- RTL support (Hebrew compatible)
- Uses COLORS from `/constants/game.ts`
- Smooth animations with React Native Reanimated

### GameTypeSelector
- Regular vs Tournament game modes
- "Coming Soon" badge for locked features
- Tournament rounds selector (2-5)
- Animated selection states

### Avatar
- 4 sizes: sm, md, lg, xl
- Profile picture with emoji fallback
- Automatic error handling

### EmojiAvatarPicker
- 32 animal emojis (matches backend)
- 15 colors (matches backend)
- Live preview
- Scrollable emoji grid

---

## Testing

Run the example:
```typescript
import ProfileComponentsExample from '@/components/profile/ExampleUsage';

// In your screen
<ProfileComponentsExample />
```

---

## Next Steps

1. Import components into your screens
2. Connect to WebSocket/state management
3. Test on iOS and Android
4. Test RTL with Hebrew language

For full documentation, see `/mobile/COMPONENT_PORT_SUMMARY.md`
