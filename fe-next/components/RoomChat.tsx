/* eslint-disable react-hooks/incompatible-library */
'use no memo'; // Disable React Compiler memoization due to TanStack Virtual incompatibility

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { Send, MessageSquare, Bell } from 'lucide-react';
import { haptics } from '@/utils/haptics/HapticsManager';
import toast from 'react-hot-toast';
import { useAnnouncer } from './GameAnnouncer';
import { useCrazyGamesChatDisabled } from '@/hooks/useCrazyGamesSettingsBridge';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

const ESTIMATED_MESSAGE_HEIGHT = 60; // Estimated height per message

// Module-level dedup: prevents duplicate notifications when multiple RoomChat
// instances are mounted (lobby, in-game, results). Only the first instance to
// process a given chatMessage fires sound/toast/vibrate/announce.
const _notifiedMessages = new Set<string>();
const DEDUP_TTL_MS = 5_000; // auto-expire entries after 5s

function shouldNotify(data: ChatMessageData): boolean {
  const key = `${data.username}:${data.timestamp}:${data.message}`;
  if (_notifiedMessages.has(key)) return false;
  _notifiedMessages.add(key);
  setTimeout(() => _notifiedMessages.delete(key), DEDUP_TTL_MS);
  return true;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isHost: boolean;
}

interface ChatMessageData {
  username: string;
  message: string;
  timestamp?: number;
  isHost?: boolean;
}

interface RoomChatProps {
  username: string;
  isHost: boolean;
  gameCode: string;
  className?: string;
  onNewMessage?: () => void;
  /** 'standalone' = speech-bubble with cream bg + tail; 'embedded' = transparent, no rotation/tail */
  variant?: 'standalone' | 'embedded';
}

const RoomChat: React.FC<RoomChatProps> = ({ username, isHost, gameCode, className = '', onNewMessage, variant = 'standalone' }) => {
  const { t } = useLanguage();
  const { socket } = useSocket();
  const { playMessageSound } = useSoundEffects();
  const { announce } = useAnnouncer();
  const isChatDisabled = useCrazyGamesChatDisabled();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAnnouncement, setLatestAnnouncement] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesLengthRef = useRef(0);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_MESSAGE_HEIGHT,
    overscan: 5,
  });

  // Handle incoming chat messages
  const handleChatMessage = useCallback((data: ChatMessageData) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      username: data.username,
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      isHost: data.isHost || false
    };

    setMessages(prev => [...prev, newMessage]);

    // Check if message is from another user
    const isOwnMessage = (isHost && data.isHost) || data.username === username;

    if (!isOwnMessage) {
      // Increment unread count (always — each instance tracks its own)
      setUnreadCount(prev => prev + 1);

      // Dedup: only fire sound/toast/vibrate/announce once across all mounted RoomChat instances
      if (shouldNotify(data)) {
        // Notify parent of new message
        onNewMessage?.();

        // Play notification sound
        playMessageSound();

        // Announce for screen readers
        const announcementText = `${data.username} says: ${data.message}`;
        setLatestAnnouncement(announcementText);
        announce(announcementText);

        // Show toast notification with click to scroll
        const newMessageIndex = messagesLengthRef.current; // Use ref to avoid stale closure
        toast(
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              // Scroll to the message using virtualizer
              virtualizer.scrollToIndex(newMessageIndex, { align: 'center', behavior: 'smooth' });
              // Apply highlight effect after scroll
              setTimeout(() => {
                const messageElement = document.getElementById(messageId);
                if (messageElement) {
                  messageElement.classList.add('ring-3', 'ring-neo-cyan', 'ring-offset-2');
                  setTimeout(() => {
                    messageElement.classList.remove('ring-3', 'ring-neo-cyan', 'ring-offset-2');
                  }, 2000);
                }
              }, 300);
              // Clear unread count
              setUnreadCount(0);
              toast.dismiss();
            }}
          >
            <Bell style={{ color: 'var(--neo-pink-light)', flexShrink: 0, fontSize: '18px' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: 'rgb(var(--neo-black))', textTransform: 'uppercase', fontSize: '14px' }}>{data.username}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.message.substring(0, 50)}{data.message.length > 50 ? '...' : ''}</div>
            </div>
          </div>,
          {
            duration: 4000,
            position: 'top-right',
            style: {
              background: 'var(--neo-cream)',
              border: '3px solid var(--neo-black)',
              boxShadow: '4px 4px 0px var(--neo-black)',
              borderRadius: '8px',
              padding: '12px 16px',
              cursor: 'pointer',
              pointerEvents: 'auto',
            },
          }
        );

        // Short tap on incoming chat — gated by haptics toggle
        if (haptics.isEnabled() && window.navigator?.vibrate) {
          window.navigator.vibrate(30);
        }
      }
    }
  }, [username, isHost, virtualizer, playMessageSound, onNewMessage, announce]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chatMessage', handleChatMessage);

    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, handleChatMessage]);

  // Request chat history on mount (for late joiners and page refresh)
  useEffect(() => {
    if (!socket || !gameCode) return;

    // Request chat history from server
    socket.emit('requestChatHistory', { gameCode });

    // Handle chat history response
    const handleChatHistory = (data: { messages: ChatMessage[] }) => {
      if (data.messages && data.messages.length > 0) {
        // Only set if we don't already have messages (prevents duplicates on reconnect)
        setMessages(prev => {
          if (prev.length === 0) {
            return data.messages.map(msg => ({
              ...msg,
              id: msg.id || `history-${msg.timestamp}-${Math.random().toString(36).substr(2, 9)}`
            }));
          }
          return prev;
        });
      }
    };

    socket.on('chatHistory', handleChatHistory);

    return () => {
      socket.off('chatHistory', handleChatHistory);
    };
  }, [socket, gameCode]);

  // Auto-scroll to bottom when new messages arrive + keep ref in sync
  useEffect(() => {
    messagesLengthRef.current = messages.length;
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages.length, virtualizer]);

  // Clear unread count when user focuses on input
  const handleInputFocus = () => {
    setUnreadCount(0);
  };

  // Read DOM value at send time. Android GBoard with Hebrew/RTL buffers IME
  // composition and may leave React state empty until commit; the DOM input
  // already has the typed text, so read from there.
  const sendMessage = () => {
    if (!socket) return;
    const raw = inputRef.current?.value ?? inputMessage;
    const trimmed = raw.trim();
    if (!trimmed) return;

    socket.emit('chatMessage', {
      message: trimmed,
      gameCode,
      username,
      isHost
    });

    setInputMessage('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Skip only when keydown is an IME composition commit (keyCode 229).
    // `isComposing` is unreliable on Android GBoard with Hebrew/RTL — it
    // stays true past the commit, blocking Enter-to-send. keyCode 229 is the
    // canonical IME-commit signal across the browsers/keyboards we support.
    // Same pattern as components/friends/messaging/MessageComposer.tsx.
    if (e.key === 'Enter' && e.nativeEvent.keyCode !== 229) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    // Use UTC-based formatting to avoid timezone hydration mismatch
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Hide chat on CrazyGames platform entirely (child safety, platform policy)
  // Also hide when platform explicitly disables chat via settings
  if (isChatDisabled || isOnCrazyGamesPlatform) return null;

  return (
    <div className={`${variant === 'standalone' ? 'speech-bubble rotate-[1deg] mb-4' : 'flex flex-col h-full'} flex flex-col ${className}`}>
      {/* Header — hidden in embedded variant (parent provides its own) */}
      {variant === 'standalone' && (
        <div className="py-3 px-4 shrink-0 border-b-3 border-neo-black">
          <h2 className="text-base font-black uppercase flex items-center gap-2 text-neo-black">
            <MessageSquare className="text-neo-pink" />
            {t('chat.title')}
            {unreadCount > 0 && (
              <AdaptiveMotion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <Badge variant="destructive" className="animate-pulse">
                  {unreadCount}
                </Badge>
              </AdaptiveMotion.div>
            )}
          </h2>
        </div>
      )}
      <CardContent className="flex-1 flex flex-col p-3 gap-3 min-h-0 overflow-hidden">
        {/* Messages Area with Virtual Scrolling */}
        <div
          ref={parentRef}
          className={`flex-1 overflow-auto pe-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 ${variant === 'embedded' ? '' : 'max-h-[300px] sm:max-h-[400px] md:max-h-[500px]'}`}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              {/* NEO-BRUTALIST empty state - compact version */}
              <AdaptiveMotion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Decorative background shapes - smaller */}
                <div className="absolute -top-1 -right-1 w-10 h-10 bg-neo-pink text-neo-white border-2 border-neo-black rotate-12 -z-10" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-neo-cyan text-neo-black border-2 border-neo-black -rotate-6 -z-10" />

                {/* Main icon container - smaller */}
                <div className="bg-neo-lime text-neo-black border-2 border-neo-black shadow-hard-sm p-2 rotate-[-2deg]">
                  <MessageSquare className="text-2xl text-neo-black" />
                </div>
              </AdaptiveMotion.div>

              {/* Text with Neo-Brutalist styling - smaller */}
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="bg-neo-black text-neo-white px-3 py-1 font-black uppercase text-xs tracking-wider rotate-[1deg] shadow-hard-sm border-2 border-neo-black">
                  {t('chat.noMessages')}
                </div>
                <p className={`font-bold text-[10px] mt-2 uppercase tracking-wide ${variant === 'embedded' ? 'text-neo-white' : 'text-neo-black/75'}`}>
                  {t('chat.startChatting')}
                </p>
              </AdaptiveMotion.div>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const msg = messages[virtualItem.index];
                if (!msg) return null;
                const isOwnMessage = msg.username === username || (isHost && msg.isHost);
                return (
                  <div
                    key={msg.id}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <AdaptiveMotion.div
                      id={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col gap-1 py-1 transition-all duration-300 ${
                        isOwnMessage ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={msg.isHost ? 'accent' : 'outline'}
                        >
                          {msg.username}
                        </Badge>
                        <span className={`text-xs font-medium ${variant === 'embedded' ? 'text-neo-white' : 'text-neo-black/70'}`}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      {/* Message bubble */}
                      <div
                        className={`px-3 py-2 max-w-[80%] wrap-break-word border-2 rounded-neo font-medium ${
                          variant === 'embedded'
                            ? isOwnMessage
                              ? 'bg-neo-cyan/20 text-neo-cyan border-neo-cyan/30'
                              : 'bg-neo-white/10 text-neo-white border-neo-white/20'
                            : isOwnMessage
                              ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm'
                              : 'bg-neo-white text-neo-black border-neo-black shadow-hard-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </AdaptiveMotion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NEO-BRUTALIST Input Area */}
        <div className="flex gap-2 shrink-0">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            // `onInput` is the reliable signal on Android GBoard with Hebrew/RTL
            // when `onChange` doesn't fire mid-composition. Mirror DOM → state.
            onInput={(e: React.FormEvent<HTMLInputElement>) => setInputMessage(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onCompositionUpdate={(e: React.CompositionEvent<HTMLInputElement>) => {
              setInputMessage(e.currentTarget.value);
            }}
            onCompositionEnd={(e: React.CompositionEvent<HTMLInputElement>) => {
              setInputMessage(e.currentTarget.value);
            }}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            maxLength={200}
            className="flex-1 min-w-0 text-sm"
            dir="auto"
          />
          <Button
            onClick={sendMessage}
            // `aria-disabled` (not real `disabled`) so taps still commit Android
            // GBoard IME composition (Hebrew/RTL) — sendMessage reads DOM value
            // and bails on empty trim. jest-dom's `toBeDisabled()` matches both.
            aria-disabled={inputMessage.length === 0 || !socket}
            size="icon"
            variant="cyan"
            className={`shrink-0 ${
              inputMessage.length === 0 || !socket
                ? 'bg-neo-navy-light text-neo-white grayscale opacity-50'
                : ''
            }`}
            aria-label={t('chat.send')}
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </CardContent>

      {/* Screen reader live region for chat announcements */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label={t('chat.newMessages')}
        className="sr-only"
      >
        {latestAnnouncement}
      </div>
    </div>
  );
};

export default RoomChat;
