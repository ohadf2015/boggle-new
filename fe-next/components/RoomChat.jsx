import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../utils/WebSocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FaPaperPlane, FaComments, FaBell } from 'react-icons/fa';
import toast from 'react-hot-toast';

const RoomChat = ({ username, isHost, gameCode, className = '' }) => {
  const { t } = useLanguage();
  const ws = useWebSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // Use useCallback to ensure handleMessage has a stable reference
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.action === 'chatMessage') {
        const newMessage = {
          id: Date.now() + Math.random(),
          username: message.username,
          message: message.message,
          timestamp: message.timestamp || Date.now(),
          isHost: message.isHost || false
        };

        setMessages(prev => [...prev, newMessage]);

        // Check if message is from another user
        const isOwnMessage = (isHost && message.isHost) || message.username === username;

        if (!isOwnMessage) {
          // Increment unread count
          setUnreadCount(prev => prev + 1);

          // Play notification sound
          if (notificationSoundRef.current) {
            notificationSoundRef.current.play().catch(err => console.log('Sound play failed:', err));
          }

          // Show toast notification
          toast(
            <div className="flex items-center gap-2">
              <FaBell className="text-blue-500" />
              <div>
                <div className="font-semibold">{message.username}</div>
                <div className="text-sm text-slate-600">{message.message.substring(0, 50)}{message.message.length > 50 ? '...' : ''}</div>
              </div>
            </div>,
            {
              duration: 3000,
              position: 'top-right',
              icon: '💬',
            }
          );

          // Vibrate on mobile
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(200);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing chat message:', error);
    }
  }, [username, isHost]);

  useEffect(() => {
    if (!ws) return;

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, handleMessage]);

  // Auto-scroll to bottom when new messages arrive and clear unread
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        // Clear unread count when scrolled to bottom
        setUnreadCount(0);
      }
    }
  }, [messages]);

  // Clear unread count when user focuses on input
  const handleInputFocus = () => {
    setUnreadCount(0);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !ws) return;

    ws.send(JSON.stringify({
      action: 'chatMessage',
      message: inputMessage.trim(),
      gameCode,
      username: isHost ? 'Host' : username,
      isHost
    }));

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
        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 pr-2">
          <div className="space-y-2">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex flex-col gap-1 ${
                    msg.username === username || (isHost && msg.isHost)
                      ? 'items-end'
                      : 'items-start'
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
                      msg.username === username || (isHost && msg.isHost)
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    {msg.message}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {messages.length === 0 && (
              <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
                {t('chat.noMessages') || 'No messages yet. Start chatting!'}
              </div>
            )}
          </div>
        </ScrollArea>

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
