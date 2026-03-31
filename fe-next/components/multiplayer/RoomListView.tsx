'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, Ghost, RefreshCw, HelpCircle, Sword, Bomb, Search, ChevronRight, Eye, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import HowToPlay from '@/components/HowToPlay';
import MultiplayerWelcomeCard from '@/components/multiplayer/MultiplayerWelcomeCard';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import AvatarStack from '@/components/multiplayer/AvatarStack';
import CrazyGamesFriendsStrip from '@/components/multiplayer/CrazyGamesFriendsStrip';
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

const MODE_CONFIG: Record<string, {
  icon: typeof Sword;
  label: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
}> = {
  classic: {
    icon: Sword,
    label: 'Classic',
    borderColor: 'border-s-neo-cyan',
    iconBg: 'bg-neo-cyan',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-cyan',
  },
  blast: {
    icon: Bomb,
    label: 'Blast',
    borderColor: 'border-s-neo-pink',
    iconBg: 'bg-neo-pink',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-pink',
  },
  'word-hunt': {
    icon: Search,
    label: 'Word Hunt',
    borderColor: 'border-s-neo-purple',
    iconBg: 'bg-neo-purple',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-purple',
  },
};

const DEFAULT_MODE_CONFIG = {
  icon: Sword,
  label: 'Classic',
  borderColor: 'border-s-neo-cyan',
  iconBg: 'bg-neo-cyan',
  iconColor: 'text-neo-black',
  textColor: 'text-neo-cyan',
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
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);

  useEffect(() => {
    if (shouldShowGuidance('multiplayerTutorialShown')) {
      setShowWelcomeCard(true);
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
  const liveMatchCount = activeRooms.filter((r) => r.gameState === 'in-progress').length;
  const hasRooms = activeRooms.length > 0;

  return (
    <>

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

        {/* Header — Arena Hub style */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between py-4 px-4 lg:px-6 flex-shrink-0 border-b-4 border-neo-black bg-neo-navy-light"
        >
          <Link
            href="/"
            aria-label={t('common.back')}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <ArrowLeft className="w-5 h-5 text-neo-white rtl:rotate-180" />
          </Link>

          <div className="text-center">
            <h1
              className="font-neo-display text-xl font-black uppercase text-neo-white tracking-tighter italic"
              style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}
            >
              {t('multiplayerFlow.roomList.arenaHub')}
            </h1>
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy shadow-hard-sm hover:bg-white/10 active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
            aria-label={t('landing.tutorial')}
          >
            <HelpCircle className="w-5 h-5 text-neo-white" />
          </button>
        </motion.header>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col px-5 lg:px-6 gap-5 overflow-y-auto pb-10 safe-area-bottom pt-5">

          {/* Welcome Card — inline, non-blocking */}
          <AnimatePresence>
            {showWelcomeCard && (
              <MultiplayerWelcomeCard onDismiss={() => setShowWelcomeCard(false)} />
            )}
          </AnimatePresence>

          {/* Live Match Status Bar */}
          {liveMatchCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neo-pink/10 border-2 border-neo-pink rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neo-pink animate-pulse" />
                <span className="text-[10px] font-black text-neo-pink uppercase">
                  {liveMatchCount} {t('multiplayerFlow.roomList.liveMatches')}
                </span>
              </div>
              <Eye className="w-4 h-4 text-neo-pink" />
            </motion.div>
          )}

          {/* Quick Start CTA — Large lime card */}
          {onQuickPlay && (
            <motion.section
              variants={quickPlayVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center"
            >
              <motion.button
                onClick={onQuickPlay}
                disabled={isQuickPlayLoading}
                className="w-full py-8 flex flex-col items-center justify-center gap-2 bg-neo-lime border-4 border-neo-black rounded-2xl shadow-hard-lg active:translate-y-1 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.97 }}
                animate={!isQuickPlayLoading ? {
                  boxShadow: [
                    '0 0 20px rgba(191,255,0,0.4), 8px 8px 0px #000',
                    '0 0 50px rgba(191,255,0,0.7), 8px 8px 0px #000',
                    '0 0 20px rgba(191,255,0,0.4), 8px 8px 0px #000',
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
              >
                {isQuickPlayLoading ? (
                  <Loader size="sm" />
                ) : (
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Zap className="w-10 h-10 text-neo-black" />
                  </motion.div>
                )}
                <span className="text-neo-black font-black text-3xl uppercase tracking-tight">
                  {t('multiplayerFlow.roomList.quickStart')}
                </span>
              </motion.button>

              <motion.button
                onClick={onCreateRoom}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 text-neo-pink hover:text-neo-pink/80 font-black text-xs uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime rounded-full px-4 py-2"
              >
                {t('multiplayerFlow.roomList.createPrivateBattle')}
              </motion.button>
            </motion.section>
          )}

          {/* CrazyGames Friends — only shown on platform */}
          <CrazyGamesFriendsStrip />

          {/* Open Arenas Section */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-3"
            aria-busy={roomsLoading}
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                {t('multiplayerFlow.roomList.openArenas')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan ms-2">
                    {totalPlayers} {t('multiplayerFlow.roomList.online')}
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
                className="flex flex-col gap-3"
                role="list"
                aria-label={t('multiplayerFlow.roomList.roomsListLabel')}
                variants={roomListVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {activeRooms.map((room) => {
                    const mode = MODE_CONFIG[room.gameMode || ''] || DEFAULT_MODE_CONFIG;
                    const ModeIcon = mode.icon;

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
                          scale: 1.01,
                          y: -2,
                          transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 border-neo-black border-s-4 ${mode.borderColor} bg-neo-navy-light/40 hover:bg-neo-navy-light transition-colors text-start group relative overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime cursor-pointer`}
                      >
                        {/* Left: Mode icon + info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Mode icon box */}
                          <div className={`w-10 h-10 ${mode.iconBg} border-2 border-neo-black rounded-lg flex items-center justify-center flex-shrink-0 shadow-hard-sm`}>
                            <ModeIcon className={`w-5 h-5 ${mode.iconColor}`} />
                          </div>

                          {/* Room info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-neo-display font-black text-neo-white text-sm uppercase truncate leading-none">
                                {room.roomName || room.gameCode}
                              </h4>
                              {room.gameState === 'in-progress' && (
                                <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse flex-shrink-0" />
                              )}
                            </div>

                            {/* Mode badge + language + player count row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wide border',
                                `${mode.iconBg}/20 ${mode.textColor} border-current/20`,
                              )}>
                                <ModeIcon className="w-2.5 h-2.5" />
                                {mode.label}
                              </span>
                              <span className="text-[8px] font-bold text-white/40">
                                {LANGUAGE_FLAGS[room.language] || '🎮'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 text-white/30" />
                                <span className={cn(
                                  'text-[8px] font-black',
                                  room.maxPlayers && room.playerCount >= room.maxPlayers
                                    ? 'text-neo-red/70'
                                    : 'text-white/50'
                                )}>
                                  {room.playerCount || 0}{room.maxPlayers ? `/${room.maxPlayers}` : ''}
                                </span>
                              </span>
                              {room.gameState === 'in-progress' && (
                                <span className={`text-[7px] font-black ${mode.textColor} uppercase italic`}>
                                  {t('multiplayerFlow.roomList.inProgress')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Avatar stack + chevron */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {room.playerAvatars && room.playerAvatars.length > 0 && (
                            <AvatarStack
                              avatars={room.playerAvatars}
                              totalCount={room.playerCount || 0}
                              maxVisible={3}
                              size="sm"
                            />
                          )}
                          <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 rtl:rotate-180 group-hover:text-white/40 transition-colors" />
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Empty State */
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
