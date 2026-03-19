'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, ChevronLeft } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { MessageComposer } from './MessageComposer';
import type { Message, MessageThread as MessageThreadType } from '@/shared/types/friends';

interface MessageThreadProps {
  thread: MessageThreadType | null;
  messages: Message[];
  isLoading: boolean;
  isOpen: boolean;
  typingUsername?: string;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onChallenge?: () => void;
  onMarkAsRead: () => void;
  currentUserId: string;
  className?: string;
}

/**
 * MessageThread - Full conversation view
 *
 * Features:
 * - Message bubbles with different styles for sent/received
 * - Auto-scroll to bottom on new messages
 * - Read receipts for sent messages
 * - Typing indicator
 * - Integrated message composer
 * - Challenge button in header
 */
export const MessageThread: React.FC<MessageThreadProps> = ({
  thread,
  messages,
  isLoading,
  isOpen,
  typingUsername,
  onClose,
  onSendMessage,
  onChallenge,
  onMarkAsRead,
  currentUserId,
  className,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isRTL = language === 'he';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  /**
   * Auto-scroll to bottom on new messages
   */
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasScrolledToBottom(true);
    }
  }, [messages, hasScrolledToBottom]);

  /**
   * Reset scroll state when thread changes
   */
  useEffect(() => {
    setHasScrolledToBottom(false);
  }, [thread?.conversationId]);

  /**
   * Mark messages as read when thread opens
   */
  useEffect(() => {
    if (isOpen && thread && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => msg.fromUserId === thread.friendUserId && !msg.isRead
      );
      if (unreadMessages.length > 0) {
        onMarkAsRead();
      }
    }
  }, [isOpen, thread, messages, onMarkAsRead]);

  /**
   * Format message timestamp
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (!thread) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
          className={cn(
            'fixed inset-0 z-50 flex flex-col',
            isDark ? 'bg-slate-900' : 'bg-white',
            className
          )}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 border-b-2 border-neo-black',
            isDark ? 'bg-slate-800' : 'bg-gray-50'
          )}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  'hover:shadow-hard hover:-translate-y-0.5 transition-all',
                  isDark ? 'bg-slate-700' : 'bg-white'
                )}
              >
                {isRTL ? (
                  <X className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                )}
              </button>

              {/* Friend info */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar
                    avatarImage={thread.friendAvatar.image}
                    customAvatar={thread.friendAvatar.customAvatar}
                    size="sm"
                    className="border-2 border-neo-black"
                  />
                  {thread.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-neo-black rounded-full" />
                  )}
                </div>
                <div>
                  <p className={cn('font-black text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    {thread.friendDisplayName || thread.friendUsername}
                  </p>
                  {thread.isOnline && (
                    <p className={cn('text-xs', isDark ? 'text-green-400' : 'text-green-600')}>
                      {t('common.connected')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Challenge button */}
            {onChallenge && (
              <button
                onClick={onChallenge}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  'hover:shadow-hard hover:-translate-y-0.5 transition-all',
                  'bg-neo-lime text-neo-black font-bold text-sm'
                )}
              >
                <Target className="w-4 h-4" />
                {t('friends.challenges.send')}
              </button>
            )}
          </div>

          {/* Messages container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader size="md" />
                <p className={cn('mt-3 text-sm font-medium', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  {t('common.loading')}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className={cn('font-bold', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  {t('friends.noMessages')}
                </p>
                <p className={cn('text-sm mt-1', isDark ? 'text-gray-500' : 'text-gray-500')}>
                  {t('friends.startConversation')}
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isMine = message.fromUserId === currentUserId;
                  const showAvatar = index === messages.length - 1 || messages[index + 1]?.fromUserId !== message.fromUserId;

                  return (
                    <motion.div
                      key={message.messageId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        'flex gap-2',
                        isMine ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')
                      )}
                    >
                      {/* Avatar for received messages */}
                      {!isMine && showAvatar && (
                        <Avatar
                          avatarImage={thread.friendAvatar.image}
                    customAvatar={thread.friendAvatar.customAvatar}
                          size="sm"
                          className="border-2 border-neo-black flex-shrink-0"
                        />
                      )}
                      {!isMine && !showAvatar && <div className="w-8" />}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[70%] p-3 rounded-neo border-2 border-neo-black',
                          isMine
                            ? 'bg-neo-cyan text-neo-black shadow-hard'
                            : (isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900') + ' shadow-hard'
                        )}
                      >
                        <p className="break-words whitespace-pre-wrap text-sm">
                          {message.message}
                        </p>
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          isMine ? 'justify-end' : 'justify-start'
                        )}>
                          <span className={cn(
                            'text-xs',
                            isMine ? 'text-neo-black/70' : (isDark ? 'text-gray-400' : 'text-gray-500')
                          )}>
                            {formatTime(message.timestamp)}
                          </span>
                          {/* Read receipt for sent messages */}
                          {isMine && (
                            <span className={cn(
                              'text-xs',
                              message.isRead ? 'text-neo-black/70' : 'text-neo-black/40'
                            )}>
                              {message.isRead ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Typing indicator */}
                {typingUsername && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'flex gap-2',
                      isRTL ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <Avatar
                      avatarImage={thread.friendAvatar.image}
                    customAvatar={thread.friendAvatar.customAvatar}
                      size="sm"
                      className="border-2 border-neo-black flex-shrink-0"
                    />
                    <div className={cn(
                      'px-4 py-2 rounded-neo border-2 border-neo-black',
                      isDark ? 'bg-slate-700' : 'bg-white'
                    )}>
                      <div className="flex gap-1">
                        <span className={cn(
                          'w-2 h-2 rounded-full animate-bounce',
                          isDark ? 'bg-gray-400' : 'bg-gray-500'
                        )} style={{ animationDelay: '0ms' }} />
                        <span className={cn(
                          'w-2 h-2 rounded-full animate-bounce',
                          isDark ? 'bg-gray-400' : 'bg-gray-500'
                        )} style={{ animationDelay: '150ms' }} />
                        <span className={cn(
                          'w-2 h-2 rounded-full animate-bounce',
                          isDark ? 'bg-gray-400' : 'bg-gray-500'
                        )} style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message composer */}
          <div className={cn(
            'border-t-2 border-neo-black',
            isDark ? 'bg-slate-800' : 'bg-gray-50'
          )}>
            <MessageComposer
              onSend={onSendMessage}
              disabled={isLoading}
              placeholder={t('friends.typeMessage')}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MessageThread;
