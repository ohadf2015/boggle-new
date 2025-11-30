/* eslint-disable react-hooks/incompatible-library */
'use no memo'; // Disable React Compiler memoization due to TanStack Virtual incompatibility

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CardContent as CardContentComponent } from './ui/card';
import { Input as InputComponent } from './ui/input';
import { Button as ButtonComponent } from './ui/button';
import { Badge as BadgeComponent } from './ui/badge';

// Type casting for JSX components not yet migrated to TS
const CardContent = CardContentComponent as any;
const Input = InputComponent as any;
const Button = ButtonComponent as any;
const Badge = BadgeComponent as any;
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { FaPaperPlane, FaComments, FaBell } from 'react-icons/fa';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

const MAX_CHAT_HEIGHT = 300; // Max height in pixels
const ESTIMATED_MESSAGE_HEIGHT = 60; // Estimated height per message

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
}

const RoomChat: React.FC<RoomChatProps> = ({ username, isHost, gameCode, className = '' }) => {
  const { t } = useLanguage();
  const { socket } = useSocket();
  const { playMessageSound } = useSoundEffects();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Increment unread count
      setUnreadCount(prev => prev + 1);

      // Play notification sound
      playMessageSound();

      // Show toast notification with click to scroll
      const newMessageIndex = messages.length; // Index of the new message (will be added after this)
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
          <FaBell style={{ color: '#FF6B9D', flexShrink: 0, fontSize: '18px' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: '#000000', textTransform: 'uppercase', fontSize: '14px' }}>{data.username}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.message.substring(0, 50)}{data.message.length > 50 ? '...' : ''}</div>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#FFFEF0',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            borderRadius: '8px',
            padding: '12px 16px',
            cursor: 'pointer',
            pointerEvents: 'auto',
          },
        }
      );

      // Vibrate on mobile
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
      }
    }
  }, [username, isHost, messages.length, virtualizer, playMessageSound]);

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
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages.length, virtualizer]);

  // Clear unread count when user focuses on input
  const handleInputFocus = () => {
    setUnreadCount(0);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) return;

    socket.emit('chatMessage', {
      message: inputMessage.trim(),
      gameCode,
      username: isHost ? 'Host' : username,
      isHost
    });

    setInputMessage('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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

  return (
    // NEO-BRUTALIST: Speech bubble container with tail and tilt
    <div className={`speech-bubble rotate-[1deg] flex flex-col mb-4 ${className}`}>
      {/* NEO-BRUTALIST Header */}
      <div className="py-3 px-4 border-b-3 border-neo-black flex-shrink-0">
        <h3 className="text-neo-black text-base font-black uppercase flex items-center gap-2">
          <FaComments className="text-neo-pink" />
          {t('chat.title') || 'Room Chat'}
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <Badge variant="destructive" className="animate-pulse">
                {unreadCount}
              </Badge>
            </motion.div>
          )}
        </h3>
      </div>
      <CardContent className="flex-1 flex flex-col p-3 gap-3 min-h-0 overflow-hidden">
        {/* Messages Area with Virtual Scrolling */}
        <div
          ref={parentRef}
          className="flex-1 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
          style={{ maxHeight: MAX_CHAT_HEIGHT }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {/* NEO-BRUTALIST empty state */}
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Decorative background shapes */}
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-neo-pink border-3 border-neo-black rotate-12 -z-10" />
                <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-neo-cyan border-3 border-neo-black -rotate-6 -z-10" />

                {/* Main icon container */}
                <div className="bg-neo-yellow border-3 border-neo-black shadow-hard p-4 rotate-[-2deg]">
                  <FaComments className="text-4xl text-neo-black" />
                </div>
              </motion.div>

              {/* Text with Neo-Brutalist styling */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="bg-neo-black text-neo-white px-4 py-2 font-black uppercase text-sm tracking-wider rotate-[1deg] shadow-hard-sm border-2 border-neo-black">
                  {t('chat.noMessages') || 'No messages yet'}
                </div>
                <p className="text-neo-black/60 font-bold text-xs mt-3 uppercase tracking-wide">
                  {t('chat.startChatting') || 'Start chatting!'}
                </p>
              </motion.div>
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
                    <motion.div
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
                        <span className="text-xs text-neo-black/50 font-medium">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      {/* NEO-BRUTALIST message bubble */}
                      <div
                        className={`px-3 py-2 max-w-[80%] break-words border-2 border-neo-black rounded-neo font-medium ${
                          isOwnMessage
                            ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                            : 'bg-neo-white text-neo-black shadow-hard-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NEO-BRUTALIST Input Area */}
        <div className="flex gap-2 flex-shrink-0">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={t('chat.placeholder') || 'Type a message...'}
            className="flex-1 min-w-0 text-sm"
            dir="auto"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
            variant="cyan"
            className="flex-shrink-0"
          >
            <FaPaperPlane />
          </Button>
        </div>
      </CardContent>
    </div>
  );
};

export default RoomChat;
