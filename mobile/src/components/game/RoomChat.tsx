/**
 * RoomChat - React Native Component
 *
 * Real-time chat component for game rooms with:
 * - Auto-scrolling message list
 * - Socket.io integration
 * - Neo-brutalist design matching web version
 * - RTL support for Hebrew
 * - Player names and badges
 * - Emoji support
 * - Message timestamps
 *
 * Ported from: fe-next/components/RoomChat.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Keyboard,
  I18nManager,
  Vibration,
} from 'react-native';
import { useSocket } from '../../contexts/SocketContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/game';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';

// Message interface
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

export const RoomChat: React.FC<RoomChatProps> = ({
  username,
  isHost,
  gameCode,
  style,
  maxHeight = 400,
}) => {
  const { t, isRTL } = useLanguage();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Handle incoming chat messages
  const handleChatMessage = useCallback(
    (data: any) => {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: ChatMessage = {
        id: messageId,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        isHost: data.isHost || false,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Check if message is from another user
      const isOwnMessage = (isHost && data.isHost) || data.username === username;

      if (!isOwnMessage) {
        // Increment unread count
        setUnreadCount((prev) => prev + 1);

        // Vibrate on new message
        Vibration.vibrate(100);
      }
    },
    [username, isHost]
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('chatMessage', handleChatMessage);

    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, handleChatMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      setUnreadCount(0);
    }
  }, [messages.length]);

  // Clear unread count when user focuses on input
  const handleInputFocus = () => {
    setUnreadCount(0);
  };

  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) return;

    socket.emit('chatMessage', {
      message: inputMessage.trim(),
      gameCode,
      username: isHost ? 'Host' : username,
      isHost,
    });

    setInputMessage('');
    Keyboard.dismiss();
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <Card style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          💬 {t('chat.title')}
        </Text>
        {unreadCount > 0 && (
          <Badge variant="destructive" style={styles.unreadBadge}>
            {unreadCount}
          </Badge>
        )}
      </View>

      <CardContent style={styles.content}>
        {/* Messages Area */}
        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesContainer, { maxHeight }]}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={true}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            // Empty state
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                {/* Decorative background shapes */}
                <View style={styles.decorativePink} />
                <View style={styles.decorativeCyan} />
                {/* Main icon container */}
                <View style={styles.iconBox}>
                  <Text style={styles.iconEmoji}>💬</Text>
                </View>
              </View>
              <View style={styles.emptyTextBox}>
                <Text style={styles.emptyTitle}>{t('chat.noMessages')}</Text>
              </View>
              <Text style={styles.emptySubtitle}>{t('chat.startChatting')}</Text>
            </View>
          ) : (
            // Messages list
            messages.map((msg) => {
              const isOwnMessage = msg.username === username || (isHost && msg.isHost);
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther,
                    isRTL && styles.messageWrapperRTL,
                  ]}
                >
                  {/* Username and timestamp */}
                  <View style={styles.messageHeader}>
                    <Badge variant={msg.isHost ? 'accent' : 'outline'} style={styles.usernameBadge}>
                      {msg.username}
                    </Badge>
                    <Text style={styles.timestamp}>{formatTime(msg.timestamp)}</Text>
                  </View>

                  {/* Message bubble */}
                  <View
                    style={[
                      styles.messageBubble,
                      isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
                    ]}
                  >
                    <Text style={styles.messageText}>{msg.message}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, isRTL && styles.inputRTL]}
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={handleInputFocus}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={COLORS.neoBlack + '66'}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            multiline={false}
            maxLength={200}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputMessage.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendButtonText}>✈️</Text>
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neoCream,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.neoBlack,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 12,
  },
  messagesContent: {
    paddingVertical: 8,
    gap: 12,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativePink: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 64,
    height: 64,
    backgroundColor: COLORS.neoPink,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    transform: [{ rotate: '12deg' }],
    zIndex: -1,
  },
  decorativeCyan: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 48,
    height: 48,
    backgroundColor: COLORS.neoCyan,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    transform: [{ rotate: '-6deg' }],
    zIndex: -1,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.neoYellow,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  iconEmoji: {
    fontSize: 32,
  },
  emptyTextBox: {
    backgroundColor: COLORS.neoBlack,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    transform: [{ rotate: '1deg' }],
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.neoWhite,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neoBlack,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Message styles
  messageWrapper: {
    marginBottom: 8,
  },
  messageWrapperOwn: {
    alignItems: 'flex-end',
  },
  messageWrapperOther: {
    alignItems: 'flex-start',
  },
  messageWrapperRTL: {
    flexDirection: 'row-reverse',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  usernameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.neoBlack,
    opacity: 0.5,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  messageBubbleOwn: {
    backgroundColor: COLORS.neoCyan,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.neoWhite,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neoBlack,
    lineHeight: 20,
  },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    backgroundColor: COLORS.neoWhite,
    color: COLORS.neoBlack,
    textAlign: 'left',
  },
  inputRTL: {
    textAlign: 'right',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    backgroundColor: COLORS.neoCyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
  },
});

export default RoomChat;
