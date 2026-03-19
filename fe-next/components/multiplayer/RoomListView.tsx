'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, ChevronRight, Ghost, RefreshCw, HelpCircle, Sword, Bomb, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom, RoomPlayerAvatar } from '@/shared/types/game';
import Avatar from '@/components/Avatar';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import HowToPlay from '@/components/HowToPlay';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import { shouldShowGuidance, markGuidanceShown } from '@/utils/contextualGuidanceStorage';

// ==================== Animation Variants ====================

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

const quickPlayVariants = {
  hidden: { y: -15, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22, delay: 0.1 },
  },
};

const roomListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const roomCardVariants = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    x: -20,
    transition: { duration: 0.2 },
  },
};

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 250, damping: 20, delay: 0.2 },
  },
};

// ==================== Mode Config ====================

const MODE_CONFIG: Record<string, { icon: typeof Sword; label: string; accentColor: string; bgColor: string; iconBg: string; joinBg: string; joinBorder: string }> = {
  classic: { icon: Sword, label: 'Classic', accentColor: 'border-s-neo-cyan', bgColor: 'bg-neo-cyan/10', iconBg: 'bg-neo-cyan', joinBg: 'bg-neo-cyan/10', joinBorder: 'border-neo-cyan/30' },
  blast: { icon: Bomb, label: 'Blast', accentColor: 'border-s-neo-pink', bgColor: 'bg-neo-pink/10', iconBg: 'bg-neo-pink', joinBg: 'bg-neo-pink/10', joinBorder: 'border-neo-pink/30' },
  'word-hunt': { icon: Search, label: 'Word Hunt', accentColor: 'border-s-neo-purple', bgColor: 'bg-neo-purple/10', iconBg: 'bg-neo-purple', joinBg: 'bg-neo-purple/10', joinBorder: 'border-neo-purple/30' },
};

// ==================== Avatar Stack ====================


const MAX_VISIBLE_AVATARS = 4;

function AvatarStack({ avatars, playerCount }: { avatars?: RoomPlayerAvatar[]; playerCount: number }) {
  if (!avatars || avatars.length === 0) return null;

  const visible = avatars.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = playerCount - visible.length;

  return (
    <div className="flex items-center flex-shrink-0">
      {visible.map((avatar, i) => (
        <div
          key={i}
          className="relative flex-shrink-0 rounded-full border-2 border-neo-navy-light overflow-hidden"
          style={{
            marginInlineStart: i === 0 ? 0 : '-0.5rem',
            zIndex: MAX_VISIBLE_AVATARS - i,
          }}
        >
          <Avatar
            customAvatar={avatar.customAvatar}
            avatarImage={avatar.avatarImage}
            userId={`room-player-${i}`}
            size="sm"
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-6 h-6 rounded-full border-2 border-neo-navy-light bg-white/10 flex items-center justify-center text-[10px] font-black text-white/70 flex-shrink-0 relative"
          style={{ marginInlineStart: '-0.5rem', zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ==================== Types ====================

interface RoomListViewProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
  onQuickPlay?: () => void;
  isQuickPlayLoading?: boolean;
}

// ==================== Component ====================

/**
 * RoomListView - Social Hub multiplayer landing
 * Single Quick Play CTA and active battles list with juicy animations
 */
const RoomListView: React.FC<RoomListViewProps> = ({
  activeRooms,
  roomsLoading,
  onRefreshRooms,
  onRoomClick,
  onCreateRoom,
  onQuickPlay,
  isQuickPlayLoading = false,
}) => {
  const { t, dir } = useLanguage();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    if (shouldShowGuidance('multiplayerTutorialShown')) {
      setShowHowToPlay(true);
      markGuidanceShown('multiplayerTutorialShown');
    }
  }, []);

  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      onRefreshRooms();
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(t('multiplayerFlow.roomList.refreshed'), {
        duration: 2000,
      });
    },
    threshold: 60,
  });

  const totalPlayers = activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0);
  const hasRooms = activeRooms.length > 0;

  return (
    <>
      <LandscapeIndicator />

      <div
        dir={dir}
        className="flex-1 min-h-0 bg-neo-navy relative flex flex-col w-full max-w-2xl mx-auto"
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />

        {/* Header */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between px-6 py-4 border-b-4 border-neo-black bg-neo-navy-light flex-shrink-0"
        >
          <Link
            href="/"
            aria-label={t('common.back')}
            className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border-3 border-neo-black bg-neo-navy shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <ArrowLeft className="w-5 h-5 text-neo-white rtl:rotate-180" />
          </Link>

          <h1 className="font-neo-display text-2xl font-black uppercase text-neo-white tracking-tighter">
            {t('multiplayerFlow.roomList.socialHub')}
          </h1>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border-3 border-neo-black bg-neo-navy shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
            aria-label={t('landing.tutorial')}
          >
            <HelpCircle className="w-5 h-5 text-neo-white" />
          </button>
        </motion.header>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col xl:flex-row px-4 lg:px-6 gap-6 xl:gap-8 overflow-y-auto pb-10 safe-area-bottom xl:items-start xl:justify-center">

          {/* Quick Play CTA — Arcade Style */}
          {onQuickPlay && (
            <motion.section
              variants={quickPlayVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center xl:sticky xl:top-4 xl:w-[320px] xl:flex-shrink-0 xl:pt-4"
            >
              <motion.button
                onClick={onQuickPlay}
                disabled={isQuickPlayLoading}
                className="w-full max-w-md py-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-neo-lime to-neo-lime-dark border-[6px] border-neo-black rounded-3xl active:translate-y-1 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.97 }}
                animate={!isQuickPlayLoading ? { boxShadow: ['0 0 20px rgba(191,255,0,0.4), 8px 8px 0px #000', '0 0 40px rgba(191,255,0,0.7), 8px 8px 0px #000', '0 0 20px rgba(191,255,0,0.4), 8px 8px 0px #000'] } : { boxShadow: '8px 8px 0px #000' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
              >
                {isQuickPlayLoading ? (
                  <Loader size="sm" />
                ) : (
                  <Zap className="w-12 h-12 text-neo-black" />
                )}
                <span className="font-neo-display text-neo-black font-black text-4xl uppercase tracking-tighter">
                  {t('multiplayerFlow.roomList.quickPlay')}
                </span>
                <span className="text-neo-black/60 font-black text-[10px] uppercase tracking-[0.2em]">
                  {t('multiplayerFlow.roomList.hostAndPlay')}
                </span>
              </motion.button>

              <motion.button
                onClick={onCreateRoom}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-6 font-neo-display font-black text-sm uppercase text-neo-pink hover:text-neo-white transition-colors flex items-center gap-2 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime rounded px-2 py-1"
              >
                {t('multiplayerFlow.roomList.orCreateCustom')}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.section>
          )}

          {/* Active Battles Section */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-3 xl:flex-1 xl:min-w-0 xl:max-w-xl"
            aria-busy={roomsLoading}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-neo-display font-black uppercase text-xs tracking-[0.15em] text-white/40 flex items-center gap-2">
                {totalPlayers > 0 && (
                  <span className="w-2 h-2 bg-neo-red rounded-full animate-pulse" />
                )}
                {t('multiplayerFlow.roomList.activeBattles')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan">
                    ({totalPlayers} {t('multiplayerFlow.roomList.online')})
                  </span>
                )}
              </h2>
              <motion.button
                onClick={onRefreshRooms}
                disabled={roomsLoading}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9, rotate: 180 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 15 }}
                className="text-neo-cyan disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime rounded"
                aria-label={t('common.refresh')}
              >
                {roomsLoading ? (
                  <Loader size="sm" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </motion.button>
            </div>

            {roomsLoading && activeRooms.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <PageLoader size="sm" />
              </div>
            ) : hasRooms ? (
              <motion.div
                className="flex flex-col gap-4"
                role="list"
                aria-label={t('multiplayerFlow.roomList.roomsListLabel')}
                variants={roomListVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {activeRooms.map((room) => {
                    const modeConfig = room.gameMode ? MODE_CONFIG[room.gameMode] : null;
                    const ModeIcon = modeConfig?.icon || Sword;
                    return (
                      <motion.button
                        key={room.gameCode}
                        role="listitem"
                        aria-label={t('multiplayerFlow.roomList.joinRoomAction', { roomName: room.roomName || room.gameCode })}
                        variants={roomCardVariants}
                        exit="exit"
                        layout
                        onClick={() => onRoomClick(room)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRoomClick(room);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                          }
                        }}
                        whileHover={{
                          scale: 1.02,
                          y: -2,
                          transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
                        }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-4 p-5 rounded-2xl border-3 border-neo-black bg-neo-navy-light shadow-hard-sm hover:shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime transition-all text-start group relative overflow-hidden ${
                          modeConfig ? `border-s-[12px] ${modeConfig.accentColor}` : ''
                        }`}
                      >
                        {/* Mode icon box */}
                        <div className={`w-12 h-12 flex-shrink-0 ${modeConfig?.iconBg || 'bg-neo-cyan'} border-3 border-neo-black rounded-xl flex items-center justify-center`}>
                          <ModeIcon className="w-6 h-6 text-neo-black" />
                        </div>

                        {/* Player avatar stack */}
                        <AvatarStack avatars={room.playerAvatars} playerCount={room.playerCount || 0} />

                        {/* Room info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-neo-display font-black text-neo-white text-lg leading-none uppercase truncate">
                              {room.roomName || room.gameCode}
                            </h4>
                            {room.gameState === 'in-progress' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neo-orange bg-neo-orange/15 border border-neo-orange/40 rounded-sm animate-pulse-subtle flex-shrink-0">
                                {t('multiplayerFlow.roomList.inProgress')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl flex-shrink-0">
                              {LANGUAGE_FLAGS[room.language] || '🎮'}
                            </span>
                            <p className="font-neo-body text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">
                              {modeConfig?.label || 'Classic'} • {room.playerCount || 0} {t('joinView.players')}
                            </p>
                          </div>
                        </div>

                        {/* Player count + Join badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-neo-display font-black text-neo-lime">
                            {room.playerCount || 0}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            modeConfig ? `${modeConfig.joinBg} ${modeConfig.joinBorder} text-neo-white` : 'bg-neo-cyan/10 border-neo-cyan/30 text-neo-cyan'
                          }`}>
                            {t('common.join')}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Empty State: Animated ghost + nudge toward Quick Play */
              <motion.div
                variants={emptyStateVariants}
                initial="hidden"
                animate="visible"
                className="bg-neo-navy-light/30 border-2 border-white/5 rounded-2xl p-6 flex flex-col items-center text-center"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                  <Ghost className="w-10 h-10 text-white/60 mb-3" />
                </motion.div>
                <h3 className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                  {t('multiplayerFlow.roomList.noRoomsYet')}
                </h3>
                <p className="text-slate-500 text-xs mt-2 font-bold">
                  {t('multiplayerFlow.roomList.beTheLegend')}
                </p>
                {onQuickPlay && (
                  <motion.button
                    onClick={onQuickPlay}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.93 }}
                    className="mt-4 px-6 py-2.5 bg-neo-lime border-3 border-neo-black rounded-xl shadow-hard-sm font-black text-sm uppercase text-neo-black hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed transition-all flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    {t('multiplayerFlow.roomList.startBattle')}
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.section>
        </div>

        {/* How to Play Dialog */}
        <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
          <DialogContent
            noDescription
            hideCloseButton
            className="max-w-md sm:max-w-lg max-h-[85dvh] overflow-hidden p-0 bg-neo-navy border-neo-black/50"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{t('landing.tutorial')}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[80dvh]">
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default RoomListView;
