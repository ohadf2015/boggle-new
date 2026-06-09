'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Target, ChevronLeft, Trash2, Flag } from 'lucide-react';
import { ReportDialog, type ReportReason } from '@/components/moderation/ReportDialog';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { MessageComposer } from './MessageComposer';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { SafetyReminderModal } from '@/components/families/SafetyReminderModal';
import type { Message, MessageThread as MessageThreadType } from '@/shared/types/friends';

interface MessageThreadProps {
  thread: MessageThreadType | null;
  messages: Message[];
  isLoading: boolean;
  isOpen: boolean;
  typingUsername?: string;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string, targetUserId: string, reason: ReportReason, context?: string) => void;
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
  onTyping,
  onDeleteMessage,
  onReportMessage,
  onChallenge,
  onMarkAsRead,
  currentUserId,
  className,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isRTL = language === 'he';

  // Families Policy: show the online-safety reminder before the first freeform
  // DM exchange, then deliver the buffered message. Uses the same global ack as
  // room chat, so a user only ever sees it once.
  const { safetyAcknowledged, acknowledgeSafety } = useSocialCapabilities();
  const [showSafety, setShowSafety] = useState(false);
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const pendingDmTextRef = useRef<string>('');

  const handleSend = (text: string) => {
    if (!safetyAcknowledged) {
      pendingDmTextRef.current = text;
      setShowSafety(true);
      return;
    }
    onSendMessage(text);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const [deleteMenuId, setDeleteMenuId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Auto-scroll to bottom on new messages or thread open
   */
  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessage = messages.length > prevMessageCountRef.current;
      const isFirstLoad = prevMessageCountRef.current === 0;
      prevMessageCountRef.current = messages.length;

      if (isFirstLoad || isNewMessage) {
        messagesEndRef.current?.scrollIntoView({
          behavior: isFirstLoad ? 'instant' : 'smooth',
        });
      }
    }
  }, [messages.length]);

  /**
   * Reset message count when thread changes
   */
  useEffect(() => {
    prevMessageCountRef.current = 0;
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
        <m.div
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
          className={cn(
            'fixed inset-0 z-50 flex flex-col',
            'pt-[env(safe-area-inset-top)]',
            isDark ? 'bg-neo-navy' : 'bg-white',
            className
          )}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 border-b-2 border-neo-black',
            isDark ? 'bg-neo-navy-light' : 'bg-gray-50'
          )}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  'hover:shadow-hard hover:-translate-y-0.5 transition-all',
                  isDark ? 'bg-neo-navy-elevated' : 'bg-white'
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
                    <span className="absolute bottom-0 inset-e-0 w-2.5 h-2.5 bg-green-500 border-2 border-neo-black rounded-full" />
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
                {messages.filter(m => !m.isDeleted).map((message, index, filtered) => {
                  const isMine = message.fromUserId === currentUserId;
                  const showAvatar = index === filtered.length - 1 || filtered[index + 1]?.fromUserId !== message.fromUserId;

                  return (
                    <m.div
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
                          className="border-2 border-neo-black shrink-0"
                        />
                      )}
                      {!isMine && !showAvatar && <div className="w-8" />}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[70%] p-3 rounded-neo border-2 border-neo-black relative',
                          isMine
                            ? 'bg-neo-cyan text-neo-black shadow-hard'
                            : (isDark ? 'bg-neo-navy-elevated text-white' : 'bg-white text-gray-900') + ' shadow-hard'
                        )}
                        onContextMenu={(e) => {
                          if (isMine && onDeleteMessage) {
                            e.preventDefault();
                            setDeleteMenuId(message.messageId);
                          }
                        }}
                        onTouchStart={() => {
                          if (isMine && onDeleteMessage) {
                            longPressTimerRef.current = setTimeout(() => {
                              setDeleteMenuId(message.messageId);
                            }, 500);
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                          }
                        }}
                        onTouchMove={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                          }
                        }}
                      >
                        {/* Delete action menu */}
                        {deleteMenuId === message.messageId && isMine && onDeleteMessage && (
                          <m.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              'absolute -top-10 inset-e-0 z-10 flex gap-1'
                            )}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteMessage(message.messageId);
                                setDeleteMenuId(null);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black bg-red-500 text-white text-xs font-bold shadow-hard-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              {t('common.delete')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMenuId(null);
                              }}
                              className={cn(
                                'px-2 py-1 rounded-neo border-2 border-neo-black text-xs font-bold shadow-hard-sm',
                                isDark ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-900'
                              )}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </m.div>
                        )}
                        <p className="wrap-break-word whitespace-pre-wrap text-sm">
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
                          {/* Report a received message (Social Apps & Features policy) */}
                          {!isMine && onReportMessage && (
                            <button
                              type="button"
                              onClick={() => setReportTarget(message)}
                              aria-label={t('report.title')}
                              className={cn(
                                'p-0.5 opacity-50 hover:opacity-100 transition-opacity',
                                isDark ? 'text-gray-400' : 'text-gray-500'
                              )}
                            >
                              <Flag className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    </m.div>
                  );
                })}

                {/* Typing indicator */}
                {typingUsername && (
                  <m.div
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
                      className="border-2 border-neo-black shrink-0"
                    />
                    <div className={cn(
                      'px-4 py-2 rounded-neo border-2 border-neo-black',
                      isDark ? 'bg-neo-navy-elevated' : 'bg-white'
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
                  </m.div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message composer */}
          <div className={cn(
            'border-t-2 border-neo-black pb-[env(safe-area-inset-bottom)]',
            isDark ? 'bg-neo-navy-light' : 'bg-gray-50'
          )}>
            <MessageComposer
              onSend={handleSend}
              onTyping={onTyping}
              disabled={isLoading}
              placeholder={t('friends.typeMessage')}
            />
          </div>

          <SafetyReminderModal
            isOpen={showSafety}
            onClose={() => setShowSafety(false)}
            onAcknowledge={() => {
              acknowledgeSafety();
              setShowSafety(false);
              const txt = pendingDmTextRef.current;
              pendingDmTextRef.current = '';
              if (txt) onSendMessage(txt);
            }}
          />

          <ReportDialog
            open={!!reportTarget}
            onClose={() => setReportTarget(null)}
            onSubmit={(reason, context) => {
              if (reportTarget && onReportMessage) {
                onReportMessage(reportTarget.messageId, reportTarget.fromUserId, reason, context);
              }
              setReportTarget(null);
            }}
            t={t}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default MessageThread;
