'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, ChevronRight, Ghost, RefreshCw, HelpCircle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
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
        className="flex-1 min-h-0 bg-neo-navy relative flex flex-col w-full max-w-lg lg:max-w-xl xl:max-w-5xl mx-auto"
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
          className="flex items-center justify-between py-3 px-4 lg:px-6 flex-shrink-0"
        >
          <Link
            href="/"
            aria-label={t('common.back')}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-3 border-neo-black bg-neo-navy-light shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <ArrowLeft className="w-5 h-5 text-neo-white rtl:rotate-180" />
          </Link>

          <h1 className="font-neo-display text-lg font-black uppercase text-neo-white tracking-tight"
            style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}
          >
            {t('multiplayerFlow.roomList.socialHub')}
          </h1>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-3 border-neo-black bg-neo-navy-light shadow-hard-sm hover:bg-white/10 active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
            aria-label={t('landing.tutorial')}
          >
            <HelpCircle className="w-5 h-5 text-neo-white" />
          </button>
        </motion.header>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col xl:flex-row px-4 lg:px-6 gap-6 xl:gap-8 overflow-y-auto pb-10 safe-area-bottom xl:items-start">

          {/* Quick Play CTA */}
          {onQuickPlay && (
            <motion.section
              variants={quickPlayVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center xl:sticky xl:top-0 xl:w-[340px] xl:flex-shrink-0"
            >
              <motion.button
                onClick={onQuickPlay}
                disabled={isQuickPlayLoading}
                className="w-full max-w-md py-6 flex flex-col items-center justify-center gap-1 bg-neo-lime border-4 border-neo-black rounded-2xl shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.97 }}
                animate={!isQuickPlayLoading ? { boxShadow: ['6px 6px 0px #000', '6px 6px 20px rgba(191,255,0,0.4), 6px 6px 0px #000', '6px 6px 0px #000'] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
              >
                <div className="flex items-center gap-2">
                  {isQuickPlayLoading ? (
                    <Loader size="sm" />
                  ) : (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Zap className="w-8 h-8 text-neo-black" />
                    </motion.div>
                  )}
                  <span className="text-neo-black font-black text-2xl uppercase tracking-tight">
                    {t('multiplayerFlow.roomList.quickPlay')}
                  </span>
                </div>
                <span className="text-neo-black/60 font-bold text-[10px] uppercase tracking-widest">
                  {t('multiplayerFlow.roomList.hostAndPlay')}
                </span>
              </motion.button>

              <motion.button
                onClick={onCreateRoom}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 text-slate-300 hover:text-neo-pink font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime rounded-full px-4 py-2 border border-white/20 hover:border-neo-pink/50 bg-white/5 hover:bg-white/10"
              >
                {t('multiplayerFlow.roomList.orCreateCustom')}
                <ChevronRight className="w-3 h-3" />
              </motion.button>
            </motion.section>
          )}

          {/* Active Battles Section */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-3 xl:flex-1 xl:min-w-0"
            aria-busy={roomsLoading}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-neo-display font-black uppercase text-xs tracking-widest text-white/70">
                {t('multiplayerFlow.roomList.activeBattles')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan ms-2">
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
                className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border-2 border-neo-black/50 bg-neo-navy/50 hover:bg-neo-cyan/20 active:translate-y-0.5 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
                aria-label={t('common.refresh')}
              >
                {roomsLoading ? (
                  <Loader size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-neo-cream" />
                )}
              </motion.button>
            </div>

            {roomsLoading && activeRooms.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <PageLoader size="sm" />
              </div>
            ) : hasRooms ? (
              <motion.div
                className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3"
                role="list"
                aria-label={t('multiplayerFlow.roomList.roomsListLabel')}
                variants={roomListVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {activeRooms.map((room) => (
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
                          const next = (e.currentTarget.nextElementSibling as HTMLElement);
                          next?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const prev = (e.currentTarget.previousElementSibling as HTMLElement);
                          prev?.focus();
                        }
                      }}
                      whileHover={{
                        scale: 1.02,
                        y: -2,
                        transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
                      }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black bg-neo-navy/60 shadow-hard-sm hover:shadow-hard hover:bg-neo-cyan/15 hover:border-neo-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime transition-[background-color,border-color] text-start group relative overflow-hidden"
                    >
                      {/* Subtle hover shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      <span className="text-xl relative">
                        {LANGUAGE_FLAGS[room.language] || '🎮'}
                      </span>
                      <div className="flex-1 min-w-0 relative">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-neo-white truncate">
                            {room.roomName || room.gameCode}
                          </p>
                          {room.gameState === 'in-progress' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neo-orange bg-neo-orange/15 border border-neo-orange/40 rounded-sm animate-pulse-subtle">
                              {t('multiplayerFlow.roomList.inProgress')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-slate-500" />
                          <p className="text-xs text-slate-400">
                            {room.playerCount || 0} {t('joinView.players')}
                          </p>
                        </div>
                      </div>
                      <motion.span
                        className="px-3 py-1.5 text-xs font-bold text-neo-black bg-neo-cyan rounded-neo border-2 border-neo-black shadow-hard-sm transition-all relative"
                        whileHover={{
                          y: -2,
                          boxShadow: '4px 4px 0px #000',
                        }}
                      >
                        {t('common.join')}
                      </motion.span>
                    </motion.button>
                  ))}
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
