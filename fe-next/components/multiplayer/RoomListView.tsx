'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, Ghost, RefreshCw, HelpCircle, Sword, Bomb, Search, CircleDot, ChevronRight, Eye, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const TITLE_TEXT_SHADOW_STYLE = { textShadow: '3px 3px 0px rgba(0,0,0,0.8)' } as const;

const HowToPlay = dynamic(() => import('@/components/HowToPlay'), { ssr: false });
const MultiplayerWelcomeCard = dynamic(() => import('@/components/multiplayer/MultiplayerWelcomeCard'), { ssr: false });
import { Loader } from '@/components/ui/Loader';
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
  borderColor: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  labelKey: string;
  descKey: string;
}> = {
  classic: {
    icon: Sword,
    borderColor: 'border-s-neo-cyan',
    iconBg: 'bg-neo-cyan',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-cyan',
    labelKey: 'multiplayerFlow.roomList.gameModes.classic',
    descKey: 'gameModes.classic.description',
  },
  blast: {
    icon: Bomb,
    borderColor: 'border-s-neo-pink',
    iconBg: 'bg-neo-pink',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-pink',
    labelKey: 'multiplayerFlow.roomList.gameModes.blast',
    descKey: 'gameModes.blast.description',
  },
  'word-hunt': {
    icon: Search,
    borderColor: 'border-s-neo-purple',
    iconBg: 'bg-neo-purple',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-purple',
    labelKey: 'multiplayerFlow.roomList.gameModes.wordHunt',
    descKey: 'gameModes.wordHunt.description',
  },
  'wheel-rush': {
    icon: CircleDot,
    borderColor: 'border-s-neo-lime',
    iconBg: 'bg-neo-lime',
    iconColor: 'text-neo-black',
    textColor: 'text-neo-lime',
    labelKey: 'multiplayerFlow.roomList.gameModes.wheelRush',
    descKey: 'gameModes.wheelRush.description',
  },
};

const DEFAULT_MODE_CONFIG = {
  icon: Sword,
  borderColor: 'border-s-neo-cyan',
  iconBg: 'bg-neo-cyan',
  iconColor: 'text-neo-black',
  textColor: 'text-neo-cyan',
  labelKey: 'multiplayerFlow.roomList.gameModes.classic',
  descKey: 'gameModes.classic.description',
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
  const { t, dir, language } = useLanguage();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

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

  const { totalPlayers, liveMatchCount } = React.useMemo(() => ({
    totalPlayers: activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0),
    liveMatchCount: activeRooms.filter((r) => r.gameState === 'in-progress').length,
  }), [activeRooms]);
  const hasRooms = activeRooms.length > 0;

  return (
    <>

      <div
        dir={dir}
        className="flex-1 min-h-0 bg-neo-navy relative flex flex-col w-full max-w-2xl lg:max-w-5xl mx-auto"
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
          initial={hasMountedRef.current ? false : "hidden"}
          animate="visible"
          className="flex items-center justify-between py-3 px-4 lg:px-6 shrink-0 border-b-2 border-white/10"
        >
          <Link
            href={`/${language}`}
            aria-label={t('common.back')}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <ArrowLeft className="w-5 h-5 text-neo-white rtl:rotate-180" />
          </Link>

          <div className="text-center">
            <h1
              className="font-neo-display text-xl font-black uppercase text-neo-white tracking-tighter italic"
              style={TITLE_TEXT_SHADOW_STYLE}
            >
              {t('multiplayerFlow.roomList.arenaHub')}
            </h1>
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 border-neo-black bg-neo-navy shadow-hard-sm hover:bg-white/10 active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
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

          {/* Action Buttons — Quick Start + Create Room side by side */}
          {onQuickPlay && (
            <motion.section
              variants={quickPlayVariants}
              initial={hasMountedRef.current ? false : "hidden"}
              animate="visible"
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <motion.button
                onClick={onQuickPlay}
                disabled={isQuickPlayLoading}
                className="flex-2 min-h-[52px] py-3 px-4 flex items-center justify-center gap-2.5 bg-neo-lime border-3 border-neo-black rounded-xl shadow-hard active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
                whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.97 }}
              >
                {isQuickPlayLoading ? (
                  <Loader size="sm" />
                ) : (
                  <Zap className="w-5 h-5 text-neo-black shrink-0" />
                )}
                <span className="text-neo-black font-black text-base sm:text-lg uppercase tracking-tight">
                  {t('multiplayerFlow.roomList.quickStart')}
                </span>
              </motion.button>

              <motion.button
                onClick={onCreateRoom}
                whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 min-h-[48px] py-3 px-4 flex items-center justify-center gap-2 bg-neo-navy-light border-3 border-neo-pink/60 rounded-xl shadow-hard-sm hover:border-neo-pink active:translate-y-0.5 active:shadow-hard-pressed transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
              >
                <Users className="w-4 h-4 text-neo-pink shrink-0" />
                <span className="text-neo-pink font-black text-sm uppercase tracking-wide whitespace-nowrap">
                  {t('multiplayerFlow.roomList.createPrivateBattle')}
                </span>
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
              <h2 className="text-xs font-black text-white/50 uppercase tracking-[0.15em]">
                {t('multiplayerFlow.roomList.openArenas')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan ms-2 text-[11px]">
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
                className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border-2 border-neo-black/50 bg-neo-navy/50 hover:bg-neo-cyan/20 active:translate-y-0.5 transition-all disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
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
              // Skeleton room cards while activeRooms socket payload arrives.
              // Showing card-shaped placeholders (instead of a centered spinner)
              // tells the player "rooms are coming" and keeps Quick Play above
              // visible — directly addresses CG mobile bounce on empty lobby.
              <div
                data-testid="room-list-skeleton"
                className="flex flex-col gap-3"
                aria-hidden="true"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-neo-black border-s-4 border-s-neo-cyan/40 bg-neo-navy-light/30 animate-pulse"
                  >
                    <div className="w-10 h-10 bg-neo-navy-light border-2 border-neo-black rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="h-3 w-2/3 bg-neo-navy-light rounded" />
                      <div className="h-2.5 w-1/3 bg-neo-navy-light/70 rounded" />
                    </div>
                    <div className="w-12 h-6 bg-neo-navy-light/70 rounded-md shrink-0" />
                  </div>
                ))}
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
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 border-neo-black border-s-4 ${mode.borderColor} bg-neo-navy-light/40 hover:bg-neo-navy-light transition-colors text-start group relative overflow-hidden focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime cursor-pointer`}
                      >
                        {/* Left: Mode icon + info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Mode icon box */}
                          <div className={`w-10 h-10 ${mode.iconBg} border-2 border-neo-black rounded-lg flex items-center justify-center shrink-0 shadow-hard-sm`}>
                            <ModeIcon className={`w-5 h-5 ${mode.iconColor}`} />
                          </div>

                          {/* Room info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-neo-display font-black text-neo-white text-sm uppercase truncate leading-none">
                                {room.roomName || room.gameCode}
                              </h4>
                              {room.gameState === 'in-progress' && (
                                <div className="w-2 h-2 rounded-full bg-neo-lime animate-pulse shrink-0" />
                              )}
                            </div>

                            {/* Mode badge + language + player count row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                title={t(mode.descKey)}
                                className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border',
                                `${mode.iconBg}/20 ${mode.textColor} border-current/20`,
                              )}>
                                <ModeIcon className="w-2.5 h-2.5" />
                                {t(mode.labelKey)}
                              </span>
                              <span className="text-[10px] font-bold text-white/60">
                                {LANGUAGE_FLAGS[room.language] || '🎮'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 text-white/50" />
                                <span className={cn(
                                  'text-[10px] font-black',
                                  room.maxPlayers && room.playerCount >= room.maxPlayers
                                    ? 'text-neo-red/70'
                                    : 'text-white/50'
                                )}>
                                  {room.playerCount || 0}{room.maxPlayers ? `/${room.maxPlayers}` : ''}
                                </span>
                              </span>
                              {room.gameState === 'in-progress' && (
                                <span className={`text-[10px] font-black ${mode.textColor} uppercase italic`}>
                                  {t('multiplayerFlow.roomList.inProgress')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Avatar stack + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {room.playerAvatars && room.playerAvatars.length > 0 && (
                            <AvatarStack
                              avatars={room.playerAvatars}
                              totalCount={room.playerCount || 0}
                              maxVisible={3}
                              size="sm"
                            />
                          )}
                          <ChevronRight className="w-4 h-4 text-white/40 shrink-0 rtl:rotate-180 group-hover:text-white/60 transition-colors" />
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
                className="bg-neo-navy-light/30 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center text-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                  <Ghost className="w-12 h-12 text-white/30 mb-2" />
                </motion.div>
                <h3 className="text-white/50 font-black text-sm uppercase tracking-widest">
                  {t('multiplayerFlow.roomList.noRoomsYet')}
                </h3>
                <p className="text-white/30 text-xs mt-1.5 font-bold max-w-[240px]">
                  {t('multiplayerFlow.roomList.beTheLegend')}
                </p>
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

