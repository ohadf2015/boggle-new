# Profile Components

React Native components for user profiles and avatars, ported from the fe-next web application.

## Components

### Avatar

Unified avatar component that displays profile pictures or emoji fallback.

**Features:**
- Supports profile picture URLs with automatic fallback to emoji
- Four size presets: `sm`, `md`, `lg`, `xl`
- Customizable emoji and background color
- Handles image loading errors gracefully

**Props:**
```typescript
interface AvatarProps {
  profilePictureUrl?: string;  // URL of profile picture
  avatarEmoji?: string;         // Fallback emoji (default: '🐶')
  avatarColor?: string;         // Background color (default: '#4ECDC4')
  size?: 'sm' | 'md' | 'lg' | 'xl';  // Size preset (default: 'md')
  style?: ViewStyle;            // Additional styles
}
```

**Usage:**
```tsx
import { Avatar } from '@/components/profile';

// Basic emoji avatar
<Avatar
  avatarEmoji="🐱"
  avatarColor="#FF6B6B"
  size="lg"
/>

// With profile picture
<Avatar
  profilePictureUrl="https://example.com/photo.jpg"
  avatarEmoji="🐶"  // Fallback if image fails
  avatarColor="#4ECDC4"
  size="md"
/>
```

**Size Reference:**
- `sm`: 24x24px, 14pt emoji
- `md`: 32x32px, 16pt emoji
- `lg`: 48x48px, 24pt emoji
- `xl`: 96x96px, 48pt emoji

---

### EmojiAvatarPicker

Modal picker for selecting emoji and color combinations for avatars.

**Features:**
- Neo-brutalist styled modal with hard shadows
- Grid of 32 animal emojis (matches backend options)
- Palette of 15 colors (matches backend options)
- Live preview of selected combination
- Smooth animations with Reanimated 2
- RTL support for Hebrew

**Props:**
```typescript
interface EmojiAvatarPickerProps {
  isOpen: boolean;              // Modal visibility
  onClose: () => void;          // Called when user cancels
  onSave: (selection: { emoji: string; color: string }) => void;
  currentEmoji?: string;        // Current emoji (default: '🐶')
  currentColor?: string;        // Current color (default: '#4ECDC4')
}
```

**Usage:**
```tsx
import { EmojiAvatarPicker } from '@/components/profile';

const [isPickerOpen, setIsPickerOpen] = useState(false);
const [avatarEmoji, setAvatarEmoji] = useState('🐶');
const [avatarColor, setAvatarColor] = useState('#4ECDC4');

const handleSave = ({ emoji, color }) => {
  setAvatarEmoji(emoji);
  setAvatarColor(color);
  // Optional: Save to backend/AsyncStorage
};

<EmojiAvatarPicker
  isOpen={isPickerOpen}
  onClose={() => setIsPickerOpen(false)}
  onSave={handleSave}
  currentEmoji={avatarEmoji}
  currentColor={avatarColor}
/>
```

**Available Emojis:**
32 animal emojis: 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞

**Available Colors:**
15 colors: `#FF6B6B` `#4ECDC4` `#45B7D1` `#FFA07A` `#98D8C8` `#F7DC6F` `#BB8FCE` `#85C1E2` `#F8B739` `#52B788` `#FF8FAB` `#6BCF7F` `#FFB347` `#9D84B7` `#FF6F61`

---

## Integration Notes

### Backend Compatibility

These components use the **exact same emoji and color arrays** as the backend (`socketHandlers.js`), ensuring consistency across the entire application.

### State Management

Recommended pattern for persisting avatar selections:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save avatar
const saveAvatar = async (emoji: string, color: string) => {
  try {
    await AsyncStorage.setItem('avatarEmoji', emoji);
    await AsyncStorage.setItem('avatarColor', color);
  } catch (error) {
    console.error('Failed to save avatar:', error);
  }
};

// Load avatar
const loadAvatar = async () => {
  try {
    const emoji = await AsyncStorage.getItem('avatarEmoji') || '🐶';
    const color = await AsyncStorage.getItem('avatarColor') || '#4ECDC4';
    setAvatarEmoji(emoji);
    setAvatarColor(color);
  } catch (error) {
    console.error('Failed to load avatar:', error);
  }
};
```

### WebSocket Integration

Send avatar to server when joining game:

```tsx
const joinGame = (gameCode: string, username: string) => {
  socket.emit('join', {
    gameCode,
    username,
    avatarEmoji,
    avatarColor,
  });
};
```

---

## Design System

All components follow the **Neo-Brutalist** design system:

- **Hard shadows**: `shadowOffset: { width: 4, height: 4 }`, `shadowOpacity: 1`, `shadowRadius: 0`
- **Bold borders**: 2-4px black borders
- **COLORS constants**: Using `/constants/game.ts`
- **High contrast**: Black text on bright backgrounds
- **Chunky shapes**: 8-16px border radius

---

## RTL Support

Components automatically adapt to RTL layout when Hebrew is selected:

```tsx
import { I18nManager } from 'react-native';

const isRTL = I18nManager.isRTL;
// Layout automatically flips for RTL languages
```

---

## Example Usage

See `ExampleUsage.tsx` for a complete working example showing:
- Different avatar sizes
- Profile picture with fallback
- Opening the emoji picker
- Saving avatar selections

---

## Dependencies

- `react-native`: Core RN components
- `react-native-reanimated`: Smooth animations
- `@/constants/game`: COLORS palette
- `@/contexts/LanguageContext`: Translation support

---

## File Structure

```
profile/
├── Avatar.tsx              # Avatar display component
├── EmojiAvatarPicker.tsx   # Emoji/color picker modal
├── ExampleUsage.tsx        # Usage examples
├── index.ts                # Exports
└── README.md               # This file
```

---

## Testing Checklist

- [ ] Test all 4 avatar sizes (sm, md, lg, xl)
- [ ] Test emoji fallback when image fails
- [ ] Test emoji picker with all 32 emojis
- [ ] Test color picker with all 15 colors
- [ ] Test save/cancel buttons
- [ ] Test RTL layout (Hebrew)
- [ ] Test animations (press states, scale effects)
- [ ] Test on iOS and Android
- [ ] Test with different screen sizes

---

## Performance Notes

- **Image caching**: Profile pictures are cached by React Native's Image component
- **Animation performance**: Uses `react-native-reanimated` for 60fps animations
- **Modal optimization**: Only renders when `isOpen={true}`

---

## Future Enhancements

Potential improvements:
- [ ] Upload custom profile pictures
- [ ] Search/filter emojis by category
- [ ] Add more emoji categories (food, sports, etc.)
- [ ] Animated emoji transitions
- [ ] Color picker with custom hex input
- [ ] Recent/favorite emojis

---

## Credits

Ported from: `fe-next/components/Avatar.jsx` and `fe-next/components/EmojiAvatarPicker.jsx`

Original design: LexiClash Web App (Next.js)
