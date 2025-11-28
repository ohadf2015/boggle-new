import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FaPaperPlane, FaComments, FaBell } from 'react-icons/fa';
import toast from 'react-hot-toast';

const MAX_CHAT_HEIGHT = 300; // Max height in pixels
const ESTIMATED_MESSAGE_HEIGHT = 60; // Estimated height per message

const RoomChat = ({ username, isHost, gameCode, className = '' }) => {
  const { t } = useLanguage();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const parentRef = useRef(null);
  const inputRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_MESSAGE_HEIGHT,
    overscan: 5,
  });

  // Handle incoming chat messages
  const handleChatMessage = useCallback((data) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage = {
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
      if (notificationSoundRef.current) {
        notificationSoundRef.current.play().catch(err => console.log('Sound play failed:', err));
      }

      // Show toast notification with click to scroll
      const newMessageIndex = messages.length; // Index of the new message (will be added after this)
      toast(
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            // Scroll to the message using virtualizer
            virtualizer.scrollToIndex(newMessageIndex, { align: 'center', behavior: 'smooth' });
            // Apply highlight effect after scroll
            setTimeout(() => {
              const messageElement = document.getElementById(messageId);
              if (messageElement) {
                messageElement.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
                setTimeout(() => {
                  messageElement.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
                }, 2000);
              }
            }, 300);
            // Clear unread count
            setUnreadCount(0);
            toast.dismiss();
          }}
        >
          <FaBell className="text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{data.username}</div>
            <div className="text-sm font-medium text-slate-800 truncate">{data.message.substring(0, 50)}{data.message.length > 50 ? '...' : ''}</div>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          icon: '💬',
          style: {
            cursor: 'pointer',
          },
        }
      );

      // Vibrate on mobile
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
      }
    }
  }, [username, isHost, messages.length, virtualizer]);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <Card className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] flex flex-col ${className}`}>
      {/* Hidden notification sound */}
      <audio
        ref={notificationSoundRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjaN0fPTgjMGHm7A7+OZUQ4PVqzn77BdGAg+ltryxnUpBSl+zPLaizsIGGS56+mgUA8NUKXh8Lp"
        preload="auto"
      />

      <CardHeader className="py-2 px-4">
        <CardTitle className="text-blue-600 dark:text-blue-300 text-base flex items-center gap-2">
          <FaComments />
          {t('chat.title') || 'Room Chat'}
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <Badge className="bg-red-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse">
                {unreadCount}
              </Badge>
            </motion.div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-2 space-y-2 min-h-0">
        {/* Messages Area with Virtual Scrolling */}
        <div
          ref={parentRef}
          className="flex-1 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
          style={{ maxHeight: MAX_CHAT_HEIGHT }}
        >
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
              {t('chat.noMessages') || 'No messages yet. Start chatting!'}
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
                          variant={msg.isHost ? 'default' : 'secondary'}
                          className={`text-xs ${
                            msg.isHost
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                          }`}
                        >
                          {msg.username}
                        </Badge>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg max-w-[80%] break-words ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
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

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={t('chat.placeholder') || 'Type a message...'}
            className="flex-1 text-sm bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
            dir="auto"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg"
          >
            <FaPaperPlane />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomChat;
