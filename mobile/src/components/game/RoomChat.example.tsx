/**
 * RoomChat Component - Quick Start Examples
 *
 * This file contains ready-to-use examples for integrating RoomChat
 * into your mobile screens.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoomChat from './RoomChat';
import { COLORS } from '../../constants/game';

// ============================================================================
// EXAMPLE 1: Basic Usage in Player View
// ============================================================================
export function BasicPlayerExample() {
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');

  useEffect(() => {
    // Load saved session data
    const loadSession = async () => {
      const savedUsername = await AsyncStorage.getItem('username');
      const savedGameCode = await AsyncStorage.getItem('gameCode');
      if (savedUsername) setUsername(savedUsername);
      if (savedGameCode) setGameCode(savedGameCode);
    };
    loadSession();
  }, []);

  if (!username || !gameCode) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.basicContainer}>
        {/* Your game UI here */}

        {/* Chat at bottom */}
        <RoomChat
          username={username}
          isHost={false}
          gameCode={gameCode}
          maxHeight={300}
        />
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// EXAMPLE 2: Host View with Keyboard Avoiding
// ============================================================================
export function HostViewExample() {
  const [gameCode] = useState('1234');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.hostContainer}>
          {/* Host controls: player list, start button, etc. */}

          {/* Chat section */}
          <View style={styles.chatSection}>
            <RoomChat
              username="Host"
              isHost={true}
              gameCode={gameCode}
              maxHeight={250}
              style={styles.hostChat}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// EXAMPLE 3: Split Screen Layout (Game + Chat)
// ============================================================================
export function SplitScreenExample() {
  const [username, setUsername] = useState('Player1');
  const [gameCode, setGameCode] = useState('1234');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.splitContainer}>
        {/* Top: Game area (letter grid, score, timer) */}
        <View style={styles.gameArea}>
          {/* <GridComponent /> */}
          {/* <GameHeader /> */}
          {/* <WordInput /> */}
        </View>

        {/* Bottom: Chat area */}
        <View style={styles.chatArea}>
          <RoomChat
            username={username}
            isHost={false}
            gameCode={gameCode}
            maxHeight={300}
            style={styles.splitChat}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// EXAMPLE 4: Minimal Chat Overlay
// ============================================================================
export function ChatOverlayExample() {
  const [username] = useState('Player1');
  const [gameCode] = useState('1234');

  return (
    <View style={styles.overlayContainer}>
      {/* Main game content */}
      <View style={styles.gameContent}>
        {/* Your game UI fills the screen */}
      </View>

      {/* Floating chat at bottom */}
      <View style={styles.floatingChat}>
        <RoomChat
          username={username}
          isHost={false}
          gameCode={gameCode}
          maxHeight={200}
          style={styles.overlayChat}
        />
      </View>
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: With Connection Status
// ============================================================================
export function ChatWithConnectionStatus() {
  const [username] = useState('Player1');
  const [gameCode] = useState('1234');
  const { isConnected } = useSocket();

  if (!isConnected) {
    return (
      <View style={styles.disconnectedContainer}>
        <Text style={styles.disconnectedText}>Reconnecting to chat...</Text>
      </View>
    );
  }

  return (
    <RoomChat
      username={username}
      isHost={false}
      gameCode={gameCode}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.neoCream,
  },

  // Basic Example
  basicContainer: {
    flex: 1,
    padding: 16,
  },

  // Host Example
  keyboardAvoid: {
    flex: 1,
  },
  hostContainer: {
    flex: 1,
    padding: 16,
  },
  chatSection: {
    flex: 1,
    maxHeight: 350,
    marginTop: 16,
  },
  hostChat: {
    flex: 1,
  },

  // Split Screen Example
  splitContainer: {
    flex: 1,
  },
  gameArea: {
    flex: 6,
    padding: 16,
    backgroundColor: COLORS.neoCream,
  },
  chatArea: {
    flex: 4,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.neoWhite,
  },
  splitChat: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Overlay Example
  overlayContainer: {
    flex: 1,
  },
  gameContent: {
    flex: 1,
  },
  floatingChat: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  overlayChat: {
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },

  // Connection Status
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  disconnectedText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neoRed,
    textTransform: 'uppercase',
  },
});

// Import helper for connection status example
import { useSocket } from '../../contexts/SocketContext';
import { Text } from 'react-native';

// ============================================================================
// Quick Reference: Common Patterns
// ============================================================================

/*

PATTERN 1: Get username from AsyncStorage
---------------------------------------
const [username, setUsername] = useState('');

useEffect(() => {
  AsyncStorage.getItem('username').then(setUsername);
}, []);


PATTERN 2: Check if user is host
---------------------------------------
const [isHost, setIsHost] = useState(false);

useEffect(() => {
  socket?.emit('checkHostStatus', { gameCode });
  socket?.on('hostStatus', ({ isHost }) => setIsHost(isHost));
  return () => socket?.off('hostStatus');
}, [socket, gameCode]);


PATTERN 3: Handle keyboard on mobile
---------------------------------------
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <RoomChat {...props} />
</KeyboardAvoidingView>


PATTERN 4: Custom max height based on screen
---------------------------------------
import { Dimensions } from 'react-native';

const { height } = Dimensions.get('window');
const chatHeight = height * 0.4; // 40% of screen

<RoomChat maxHeight={chatHeight} {...props} />


PATTERN 5: RTL detection
---------------------------------------
import { useLanguage } from '../../contexts/LanguageContext';

const { isRTL } = useLanguage();

// RoomChat handles RTL automatically, but if you need to know:
if (isRTL) {
  // Hebrew layout
} else {
  // LTR layout
}

*/
