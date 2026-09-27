'use client';

import { useState, useEffect, useRef, useContext, memo, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SocketContext } from '@/utils/SocketContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import RoomChat from '@/components/RoomChat';
import { useCrazyGamesChatDisabled } from '@/hooks/useCrazyGamesSettingsBridge';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface MobileChatFabProps {
  username: string;
  isHost: boolean;
  gameCode: string;
}

/** How long the unread badge stays visible before auto-hiding (ms) */
const BADGE_VISIBLE_MS = 5000;

/**
 * Non-intrusive mobile chat for multiplayer gameplay.
 *
 * Completely invisible during gameplay. Only appears when:
 * 1. A new chat message arrives from another player → shows a small badge for 5s
 * 2. Player taps the badge → opens chat bottom sheet
 * 3. When sheet is closed, badge disappears immediately (no lingering UI)
 *
 * Listens directly on the socket for `chatMessage` events so it works
 * even when RoomChat is not mounted.
 */
export const MobileChatFab = memo<MobileChatFabProps>(({ username, isHost, gameCode }) => {
  const { t } = useLanguageSafe();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketCtx = useContext(SocketContext);
  const socket = socketCtx?.socket ?? null;
  const isChatDisabled = useCrazyGamesChatDisabled();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Listen for chat messages directly on socket (independent of RoomChat mount)
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: { username?: string }) => {
      // Ignore own messages
      if (data.username === username || (isHost && data.username === 'Host')) return;
      // Don't badge if sheet is already open
      if (isOpen) return;

      setHasUnread(true);
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => setHasUnread(false), BADGE_VISIBLE_MS);
    };

    socket.on('chatMessage', handleChatMessage);
    return () => { socket.off('chatMessage', handleChatMessage); };
  }, [socket, username, isHost, isOpen, clearHideTimer]);

  // Cleanup timer on unmount
  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    clearHideTimer();
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasUnread(false);
    clearHideTimer();
  };

  if (isChatDisabled || isOnCrazyGamesPlatform) return null;

  return (
    <div className="lg:hidden">
      {/* Unread badge — only visible when a new message arrives, auto-hides after 5s */}
      {hasUnread && !isOpen && (
          <m.button
            key="chat-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleOpen}
            className={cn(
              'fixed right-3 z-30',
              'bottom-[calc(5rem+env(safe-area-inset-bottom)+var(--admob-banner-height,0px))]',
              'w-10 h-10 min-w-[44px] min-h-[44px]',
              'flex items-center justify-center',
              'bg-neo-navy/90 border-2 border-neo-lime/60 rounded-full',
            )}
            aria-label={t('common.chat')}
          >
            <MessageSquare className="w-4 h-4 text-neo-lime" />
            <m.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neo-lime border border-neo-black rounded-full"
            />
          </m.button>
        )}

      {/* Chat Sheet Overlay */}
      {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-300"
              onClick={handleClose}
            />

            {/* Chat Sheet */}
            <div
              className={cn(
                'fixed bottom-0 left-0 right-0 z-50',
                'h-[55dvh] max-h-[380px]',
                'bg-neo-navy border-t-3 border-neo-black',
                'rounded-t-neo-lg shadow-hard-lg',
                'flex flex-col',
                'pb-[env(safe-area-inset-bottom)]',
                'animate-in slide-in-from-bottom-full duration-300',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neo-black/30 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-neo-cyan" />
                  <span className="text-sm font-bold text-neo-white uppercase tracking-wide">{t('common.chat')}</span>
                </div>
                <button
                  onClick={handleClose}
                  className={cn(
                    'w-8 h-8 min-w-[44px] min-h-[44px]',
                    'flex items-center justify-center',
                    'text-neo-white hover:text-neo-white',
                    'transition-colors',
                  )}
                  aria-label={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <RoomChat
                  username={isHost ? 'Host' : username}
                  isHost={isHost}
                  gameCode={gameCode}
                  className="h-full"
                  variant="embedded"
                />
              </div>
            </div>
          </>
        )}
    </div>
  );
});

MobileChatFab.displayName = 'MobileChatFab';
