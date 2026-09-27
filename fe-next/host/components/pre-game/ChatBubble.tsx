'use client';

import React, { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import RoomChat from '../../../components/RoomChat';
import { cn } from '../../../lib/utils';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface ChatBubbleProps {
  gameCode: string;
  username: string;
  isHost: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

export function ChatBubble({ gameCode, username, isHost, t }: ChatBubbleProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  const handleNewMessage = useCallback(() => {
    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  if (isOnCrazyGamesPlatform) return null;

  return (
    <>
      {/* Floating bubble button */}
      {!isOpen && (
        <m.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleOpen}
          className="fixed bottom-20 end-4 lg:bottom-6 lg:end-6 z-40 w-14 h-14 rounded-full bg-neo-pink border-3 border-neo-black shadow-hard-lg flex items-center justify-center active:translate-y-0.5 active:shadow-hard-pressed transition-all"
          aria-label={t('chat.title')}
        >
          <MessageSquare className="w-6 h-6 text-neo-black" />
          {unreadCount > 0 && (
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -end-1.5 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-neo-red border-2 border-neo-black text-[11px] font-black text-neo-white px-1 shadow-hard-sm"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </m.span>
          )}
        </m.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={cn(
              'fixed z-40',
              'bottom-20 end-3 start-3 lg:bottom-6 lg:end-6 lg:start-auto lg:w-[380px]',
              'max-h-[60vh] lg:max-h-[500px]',
              'rounded-neo-lg border-3 border-neo-black bg-slate-800/95 shadow-hard-xl backdrop-blur-sm',
              'flex flex-col overflow-hidden'
            )}
          >
            {/* Close header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-neo-white/10 shrink-0">
              <h2 className="text-sm font-black uppercase text-neo-cream flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neo-pink" />
                {t('chat.title')}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center bg-neo-red/80 border-2 border-neo-black rounded-neo shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all"
                aria-label={t('common.close')}
              >
                <X className="w-3.5 h-3.5 text-neo-black" />
              </button>
            </div>
            {/* Embedded chat */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <RoomChat
                gameCode={gameCode}
                username={username}
                isHost={isHost}
                variant="embedded"
                onNewMessage={handleNewMessage}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatBubble;
