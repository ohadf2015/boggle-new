# RoomChat Component - Usage Guide

## Overview

The `RoomChat` component is a React Native implementation of the real-time chat system for game rooms. It provides a neo-brutalist styled chat interface with support for RTL languages, emoji, auto-scrolling, and Socket.io integration.

**Ported from:** `fe-next/components/RoomChat.jsx`

## Features

- Real-time messaging via Socket.io
- Auto-scrolling to new messages
- Unread message counter with visual badge
- Neo-brutalist design matching web version
- RTL support for Hebrew
- Player name badges (host/player distinction)
- Message timestamps
- Emoji support
- Vibration feedback on new messages
- Keyboard handling
- Empty state with decorative elements
- Maximum character limit (200)

## Installation & Dependencies

The component requires the following dependencies (already included in the mobile project):

```json
{
  "socket.io-client": "^4.x.x",
  "@react-native-async-storage/async-storage": "^1.x.x",
  "react-native": "^0.x.x"
}
```

## Basic Usage

```tsx
import React from 'react';
import { View } from 'react-native';
import RoomChat from './components/game/RoomChat';

function GameScreen() {
  return (
    <View style={{ flex: 1 }}>
      <RoomChat
        username="Player1"
        isHost={false}
        gameCode="1234"
      />
    </View>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `username` | `string` | Yes | - | Current user's display name |
| `isHost` | `boolean` | Yes | - | Whether the user is the game host |
| `gameCode` | `string` | Yes | - | 4-digit game room code |
| `style` | `ViewStyle` | No | `undefined` | Custom container styles |
| `maxHeight` | `number` | No | `400` | Maximum height for message scroll area (px) |

## Advanced Examples

### Example 1: Host View Integration

```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import RoomChat from './components/game/RoomChat';
import { useSocket } from '../../contexts/SocketContext';

function HostView() {
  const [gameCode] = useState('1234');
  const { isConnected } = useSocket();

  if (!isConnected) {
    return <Text>Connecting to server...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Other host controls */}
      <View style={styles.chatContainer}>
        <RoomChat
          username="Host"
          isHost={true}
          gameCode={gameCode}
          maxHeight={300}
          style={styles.chat}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  chatContainer: {
    flex: 1,
    maxHeight: 400,
  },
  chat: {
    flex: 1,
  },
});
```

### Example 2: Player View with Custom Styling

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import RoomChat from './components/game/RoomChat';
import { COLORS } from '../../constants/game';

function PlayerView({ username, gameCode }) {
  return (
    <View style={styles.container}>
      {/* Game grid and other player UI */}

      {/* Chat positioned at bottom */}
      <View style={styles.chatWrapper}>
        <RoomChat
          username={username}
          isHost={false}
          gameCode={gameCode}
          maxHeight={250}
          style={styles.customChat}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neoCream,
  },
  chatWrapper: {
    height: 300,
    marginTop: 16,
  },
  customChat: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
});
```

### Example 3: Split Screen Layout

```tsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import RoomChat from './components/game/RoomChat';
import GridComponent from './GridComponent';

const { height } = Dimensions.get('window');

function GamePlayScreen({ username, gameCode }) {
  return (
    <View style={styles.container}>
      {/* Game area (60% of screen) */}
      <View style={styles.gameArea}>
        <GridComponent />
      </View>

      {/* Chat area (40% of screen) */}
      <View style={styles.chatArea}>
        <RoomChat
          username={username}
          isHost={false}
          gameCode={gameCode}
          maxHeight={height * 0.35}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameArea: {
    flex: 6,
    padding: 16,
  },
  chatArea: {
    flex: 4,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
```

### Example 4: Collapsible Chat

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import RoomChat from './components/game/RoomChat';
import { COLORS } from '../../constants/game';

function CollapsibleChatView({ username, gameCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(60));

  const toggleChat = () => {
    setIsExpanded(!isExpanded);
    Animated.spring(animatedHeight, {
      toValue: isExpanded ? 60 : 400,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.chatContainer, { height: animatedHeight }]}>
        <TouchableOpacity style={styles.chatHeader} onPress={toggleChat}>
          <Text style={styles.chatHeaderText}>
            {isExpanded ? '▼ Hide Chat' : '▲ Show Chat'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <RoomChat
            username={username}
            isHost={false}
            gameCode={gameCode}
            maxHeight={340}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.neoCream,
    borderTopWidth: 4,
    borderTopColor: COLORS.neoBlack,
  },
  chatHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.neoBlack,
  },
  chatHeaderText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
});
```

## Socket.io Events

The component listens to and emits the following Socket.io events:

### Incoming Events (Listened)

- **`chatMessage`**: Receives new chat messages
  ```typescript
  {
    username: string;
    message: string;
    timestamp: number;
    isHost: boolean;
  }
  ```

### Outgoing Events (Emitted)

- **`chatMessage`**: Sends a new chat message
  ```typescript
  {
    message: string;
    gameCode: string;
    username: string;
    isHost: boolean;
  }
  ```

## TypeScript Types

```typescript
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isHost: boolean;
}

export interface RoomChatProps {
  username: string;
  isHost: boolean;
  gameCode: string;
  style?: ViewStyle;
  maxHeight?: number;
}
```

## Styling Customization

The component uses the COLORS constant for consistent neo-brutalist styling:

```typescript
import { COLORS } from '../../constants/game';

const customStyles = StyleSheet.create({
  customContainer: {
    backgroundColor: COLORS.neoCream,
    borderColor: COLORS.neoBlack,
    borderWidth: 4,
  },
  customMessageBubble: {
    backgroundColor: COLORS.neoCyan,
    borderColor: COLORS.neoBlack,
  },
});
```

### Available Colors

- `COLORS.neoYellow` - Primary yellow (#FFE135)
- `COLORS.neoCyan` - Cyan accent (#00FFFF)
- `COLORS.neoPink` - Pink accent (#FF1493)
- `COLORS.neoOrange` - Orange (#FF6B35)
- `COLORS.neoBlack` - Black borders (#000000)
- `COLORS.neoWhite` - White (#FFFFFF)
- `COLORS.neoCream` - Cream background (#FFFEF0)
- `COLORS.neoRed` - Error red (#FF3366)

## RTL Support

The component automatically supports RTL layout for Hebrew:

```tsx
import { useLanguage } from '../../contexts/LanguageContext';

function RTLExample() {
  const { isRTL, t } = useLanguage();

  return (
    <RoomChat
      username="משתמש"
      isHost={false}
      gameCode="1234"
    />
  );
}
```

The component will:
- Reverse message alignment (own messages on left, others on right)
- Align input text to the right
- Mirror the input/button layout

## Accessibility

- Uses semantic text colors with high contrast
- Provides haptic feedback (vibration) on new messages
- Auto-scrolls to new messages for visibility
- Clear visual distinction between host and player messages
- Timestamp for message context

## Performance Considerations

- Messages are efficiently rendered with React Native's optimized list handling
- Auto-scroll is debounced to prevent excessive renders
- Socket event listeners are properly cleaned up on unmount
- Input is limited to 200 characters to prevent long message issues

## Troubleshooting

### Messages not appearing

1. Verify Socket.io connection:
```tsx
const { isConnected } = useSocket();
console.log('Socket connected:', isConnected);
```

2. Check gameCode matches between sender and receiver

3. Verify socket event listeners are properly attached

### Auto-scroll not working

- Ensure `maxHeight` prop is set appropriately for your layout
- Check that parent container has proper flex/height constraints

### RTL issues

- Ensure `I18nManager.forceRTL(true)` is called in app initialization for Hebrew
- May require app restart for full RTL effect

### Styling conflicts

- The component uses absolute positioning for decorative elements
- Ensure parent container provides adequate space
- Use the `style` prop to override container styles if needed

## Related Components

- `Badge` - Used for username display
- `Card` - Container component
- `Input` - Text input styling reference
- `Button` - Button styling reference

## Translation Keys

Required translation keys (already included in mobile translations):

```typescript
{
  chat: {
    title: 'Room Chat',
    placeholder: 'Type a message...',
    noMessages: 'No messages yet',
    startChatting: 'Start chatting!',
  }
}
```

## Example: Full Implementation with Context

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import RoomChat from './components/game/RoomChat';
import { useSocket } from './contexts/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

function GameRoomScreen({ route }) {
  const { gameCode } = route.params;
  const [username, setUsername] = useState('');
  const [isHost, setIsHost] = useState(false);
  const { socket, isConnected } = useSocket();

  // Load username from storage
  useEffect(() => {
    const loadUsername = async () => {
      const savedUsername = await AsyncStorage.getItem('username');
      if (savedUsername) {
        setUsername(savedUsername);
      }
    };
    loadUsername();
  }, []);

  // Check if user is host
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('checkHostStatus', { gameCode });
      socket.on('hostStatus', ({ isHost: hostStatus }) => {
        setIsHost(hostStatus);
      });

      return () => {
        socket.off('hostStatus');
      };
    }
  }, [socket, isConnected, gameCode]);

  if (!username || !isConnected) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <RoomChat
        username={username}
        isHost={isHost}
        gameCode={gameCode}
        maxHeight={400}
        style={styles.chat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  chat: {
    flex: 1,
  },
});

export default GameRoomScreen;
```

## License

Part of the LexiClash mobile application.
