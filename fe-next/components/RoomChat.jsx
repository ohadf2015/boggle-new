import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../utils/WebSocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FaPaperPlane, FaComments } from 'react-icons/fa';

const RoomChat = ({ username, isHost, gameCode, className = '' }) => {
  const { t } = useLanguage();
  const ws = useWebSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.action === 'chatMessage') {
          setMessages(prev => [...prev, {
            id: Date.now() + Math.random(),
            username: message.username,
            message: message.message,
            timestamp: message.timestamp || Date.now(),
            isHost: message.isHost || false
          }]);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    const originalHandler = ws.onmessage;

    const chainedHandler = (event) => {
      handleMessage(event);
      if (originalHandler) {
        originalHandler(event);
      }
    };

    ws.onmessage = chainedHandler;

    return () => {
      ws.onmessage = originalHandler;
    };
  }, [ws]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

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
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-blue-600 dark:text-blue-300 text-base flex items-center gap-2">
          <FaComments />
          {t('chat.title') || 'Room Chat'}
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
