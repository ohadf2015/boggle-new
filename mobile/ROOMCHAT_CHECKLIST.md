# RoomChat Integration Checklist

Quick reference guide for integrating the RoomChat component into your React Native screens.

---

## Pre-Integration Checklist

### 1. Verify Dependencies

- [ ] Socket.io client installed and working
  ```bash
  npm list socket.io-client
  ```

- [ ] AsyncStorage installed
  ```bash
  npm list @react-native-async-storage/async-storage
  ```

- [ ] React Native vector icons (if using custom icons)

### 2. Verify Context Providers

- [ ] SocketProvider is wrapping your app
  ```tsx
  // App.tsx
  <SocketProvider>
    <LanguageProvider>
      <YourApp />
    </LanguageProvider>
  </SocketProvider>
  ```

- [ ] LanguageProvider is available
- [ ] Translation keys for chat exist in translations file

### 3. Verify UI Components

- [ ] Badge component exists: `mobile/src/components/ui/Badge.tsx`
- [ ] Card component exists: `mobile/src/components/ui/Card.tsx`
- [ ] Button component exists: `mobile/src/components/ui/Button.tsx`
- [ ] Input component exists: `mobile/src/components/ui/Input.tsx`

### 4. Verify Constants

- [ ] COLORS constant exists: `mobile/src/constants/game.ts`
- [ ] All required colors are defined:
  - neoCream, neoBlack, neoWhite
  - neoCyan, neoPink, neoYellow
  - neoRed, neoOrange

---

## Integration Steps

### Step 1: Import Component

```tsx
import RoomChat from './components/game/RoomChat';
```

### Step 2: Get Required Props

You need 3 required props:

```tsx
// 1. Username (from storage or context)
const [username, setUsername] = useState('');

useEffect(() => {
  AsyncStorage.getItem('username').then(savedUsername => {
    if (savedUsername) setUsername(savedUsername);
  });
}, []);

// 2. Game Code (from navigation params or context)
const { gameCode } = route.params; // or from state

// 3. Is Host (from socket event or context)
const [isHost, setIsHost] = useState(false);

useEffect(() => {
  socket?.emit('checkHostStatus', { gameCode });
  socket?.on('hostStatus', ({ isHost }) => setIsHost(isHost));
  return () => socket?.off('hostStatus');
}, [socket, gameCode]);
```

### Step 3: Add Component to Screen

```tsx
<RoomChat
  username={username}
  isHost={isHost}
  gameCode={gameCode}
/>
```

### Step 4: Handle Keyboard (iOS)

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <RoomChat {...props} />
</KeyboardAvoidingView>
```

### Step 5: Adjust Layout

Choose a layout pattern:

**Option A: Bottom Section (Recommended)**
```tsx
<View style={{ flex: 1 }}>
  {/* Game UI */}
  <View style={{ flex: 6 }}>
    {/* Grid, timer, score, etc. */}
  </View>

  {/* Chat */}
  <View style={{ flex: 4 }}>
    <RoomChat {...props} maxHeight={300} />
  </View>
</View>
```

**Option B: Floating Overlay**
```tsx
<View style={{ flex: 1 }}>
  {/* Game UI */}
  <View style={{ flex: 1 }}>
    {/* Your game */}
  </View>

  {/* Floating Chat */}
  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }}>
    <RoomChat {...props} />
  </View>
</View>
```

---

## Testing Checklist

### Functional Tests

- [ ] Chat renders without errors
- [ ] Can type in input field
- [ ] Send button enables when text is entered
- [ ] Send button disabled when input is empty
- [ ] Pressing send/enter sends message
- [ ] Sent message appears in list
- [ ] Message from other user appears
- [ ] Auto-scroll works when new message arrives
- [ ] Unread counter increments on new message
- [ ] Unread counter resets when input focused
- [ ] Vibration occurs on new message (real device)

### Visual Tests

- [ ] Neo-brutalist styling matches design
- [ ] Borders are thick and black
- [ ] Shadows are visible
- [ ] Own messages have cyan background
- [ ] Other messages have white background
- [ ] Host badge shows pink color
- [ ] Player badge shows outline style
- [ ] Timestamp displays correctly
- [ ] Empty state shows with decorative shapes
- [ ] Empty state text is readable

### RTL Tests (Hebrew)

- [ ] Switch language to Hebrew
- [ ] Messages align correctly (own on left, others on right)
- [ ] Input text aligns to right
- [ ] Send button is on left side
- [ ] Username badges display properly
- [ ] Scrolling direction is correct

### Edge Cases

- [ ] Long message wraps correctly
- [ ] 200 character limit enforced
- [ ] Emoji display correctly 😀 💬 🎮
- [ ] Username with special characters works
- [ ] Rapid message sending works
- [ ] Connection loss/reconnect handled
- [ ] Component unmount cleans up listeners
- [ ] No memory leaks on repeated mount/unmount

### Platform Tests

- [ ] Works on iOS simulator
- [ ] Works on iOS device
- [ ] Works on Android emulator
- [ ] Works on Android device
- [ ] Keyboard behavior correct on iOS
- [ ] Keyboard behavior correct on Android
- [ ] Vibration works on real device (not simulator)

---

## Troubleshooting Guide

### Issue: Messages not appearing

**Check:**
1. Is socket connected?
   ```tsx
   const { isConnected } = useSocket();
   console.log('Socket connected:', isConnected);
   ```

2. Are you listening to correct event?
   ```tsx
   socket.on('chatMessage', console.log);
   ```

3. Does gameCode match between users?

4. Check server logs for message delivery

**Fix:**
- Verify `EXPO_PUBLIC_WS_URL` environment variable
- Restart Metro bundler
- Check server is running
- Verify socket room logic on backend

---

### Issue: Auto-scroll not working

**Check:**
1. Is maxHeight set?
2. Does parent have proper constraints?
3. Is ScrollView ref working?

**Fix:**
```tsx
// Ensure parent has height constraint
<View style={{ height: 400 }}>
  <RoomChat maxHeight={300} {...props} />
</View>
```

---

### Issue: Keyboard covers input

**Fix:**
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
  keyboardVerticalOffset={100} // Adjust as needed
>
  <RoomChat {...props} />
</KeyboardAvoidingView>
```

---

### Issue: RTL not working

**Check:**
1. Is language set to Hebrew?
   ```tsx
   const { language } = useLanguage();
   console.log('Current language:', language);
   ```

2. Is I18nManager forced?
   ```tsx
   import { I18nManager } from 'react-native';
   console.log('Is RTL:', I18nManager.isRTL);
   ```

**Fix:**
- App may need restart for RTL to take full effect
- Call `I18nManager.forceRTL(true)` before app loads
- Reload JavaScript bundle

---

### Issue: Styling looks wrong

**Check:**
1. Are COLORS imported correctly?
   ```tsx
   import { COLORS } from '../../constants/game';
   console.log('Colors:', COLORS);
   ```

2. Are UI components using correct styles?

**Fix:**
- Verify all COLORS values are defined
- Check Card, Badge components are latest versions
- Use `style` prop to override container styles

---

### Issue: TypeScript errors

**Fix:**
```tsx
// Ensure proper typing
import { RoomChatProps } from './RoomChat';

const chatProps: RoomChatProps = {
  username: 'Player1',
  isHost: false,
  gameCode: '1234',
};
```

---

## Performance Optimization

### If chat becomes slow with many messages:

1. **Add message limit:**
```tsx
// In RoomChat.tsx, modify setMessages:
setMessages(prev => {
  const updated = [...prev, newMessage];
  // Keep only last 100 messages
  return updated.slice(-100);
});
```

2. **Implement pagination:**
```tsx
// Load older messages on scroll to top
const handleScroll = (event) => {
  if (event.nativeEvent.contentOffset.y === 0) {
    loadOlderMessages();
  }
};
```

3. **Use FlatList instead of ScrollView:**
```tsx
// Replace ScrollView with FlatList for better performance
<FlatList
  data={messages}
  renderItem={({ item }) => <MessageItem message={item} />}
  keyExtractor={item => item.id}
/>
```

---

## Security Checklist

- [ ] Input sanitized on server side
- [ ] Rate limiting implemented on server
- [ ] WebSocket authentication enabled
- [ ] Room isolation verified (messages only to same gameCode)
- [ ] No sensitive data in chat messages
- [ ] XSS protection (React Native auto-escapes)

---

## Deployment Checklist

### Before Production:

- [ ] Socket.io server URL is production URL
- [ ] Connection timeout values are appropriate
- [ ] Error handling is robust
- [ ] Logging is production-ready (no console.logs)
- [ ] Analytics events added (optional)
- [ ] Crash reporting integrated (Sentry, etc.)
- [ ] Performance monitoring enabled

### Environment Variables:

```bash
# .env.production
EXPO_PUBLIC_WS_URL=https://lexiclash.com

# .env.development
EXPO_PUBLIC_WS_URL=http://192.168.1.100:3001
```

---

## Quick Start Template

Copy and paste this into your screen:

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoomChat from '../components/game/RoomChat';
import { useSocket } from '../contexts/SocketContext';
import { COLORS } from '../constants/game';

export default function GameScreen({ route }) {
  const { gameCode } = route.params;
  const { socket } = useSocket();
  const [username, setUsername] = useState('');
  const [isHost, setIsHost] = useState(false);

  // Load username
  useEffect(() => {
    AsyncStorage.getItem('username').then(setUsername);
  }, []);

  // Check host status
  useEffect(() => {
    if (socket) {
      socket.emit('checkHostStatus', { gameCode });
      socket.on('hostStatus', ({ isHost }) => setIsHost(isHost));
      return () => socket.off('hostStatus');
    }
  }, [socket, gameCode]);

  if (!username) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Your game UI here */}

        <View style={styles.chatContainer}>
          <RoomChat
            username={username}
            isHost={isHost}
            gameCode={gameCode}
            maxHeight={300}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neoCream,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
});
```

---

## Support Resources

- **Component Documentation:** `mobile/src/components/game/RoomChatUsage.md`
- **Examples:** `mobile/src/components/game/RoomChat.example.tsx`
- **Implementation Summary:** `mobile/ROOMCHAT_IMPLEMENTATION.md`
- **Source Code:** `mobile/src/components/game/RoomChat.tsx`

---

**Status:** ✅ Ready for integration
**Last Updated:** 2025-11-29
