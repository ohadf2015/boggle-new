'use client';

import React, { useState, useEffect } from 'react';
import { motion as m } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, ChevronRight, Ghost, RefreshCw, Settings2 } from 'lucide-react';
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

interface RoomListViewProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
  onQuickPlay?: () => void;
  isQuickPlayLoading?: boolean;
}

/**
 * RoomListView - Social Hub multiplayer landing
 * Single Quick Play CTA and active battles list
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
      toast.success(t('multiplayerFlow.roomList.refreshed') || 'Rooms refreshed', {
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
        className="flex-1 min-h-0 bg-neo-navy relative flex flex-col max-w-5xl mx-auto"
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />

        {/* Header */}
        <m.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between py-3 px-4 flex-shrink-0"
        >
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-3 border-neo-black bg-neo-navy-light shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <ArrowLeft className="w-5 h-5 text-neo-white rtl:rotate-180" />
          </Link>

          <h1 className="font-neo-display text-lg font-black uppercase text-neo-white tracking-tight"
            style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}
          >
            {t('multiplayerFlow.roomList.socialHub') || 'Social Hub'}
          </h1>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-3 border-neo-black bg-neo-navy-light shadow-hard-sm hover:bg-white/10 active:shadow-hard-pressed active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
            aria-label={t('landing.tutorial')}
          >
            <Settings2 className="w-5 h-5 text-neo-white" />
          </button>
        </m.header>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col px-4 gap-8 overflow-y-auto pb-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-6">

          {/* Left Column: Quick Play CTA */}
          <div className="lg:sticky lg:top-4 lg:self-start">
          {/* Quick Play CTA */}
          {onQuickPlay && (
            <m.section
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <m.button
                onClick={onQuickPlay}
                disabled={isQuickPlayLoading}
                className="w-full py-6 lg:py-5 flex flex-col items-center justify-center gap-1 bg-neo-lime border-4 border-neo-black rounded-2xl shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                animate={!isQuickPlayLoading ? { boxShadow: ['6px 6px 0px #000', '6px 6px 20px rgba(191,255,0,0.4), 6px 6px 0px #000', '6px 6px 0px #000'] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-2">
                  {isQuickPlayLoading ? (
                    <Loader size="sm" />
                  ) : (
                    <Zap className="w-8 h-8 text-neo-black" />
                  )}
                  <span className="text-neo-black font-black text-2xl lg:text-xl uppercase tracking-tight">
                    {t('multiplayerFlow.roomList.quickPlay') || 'Quick Play'}
                  </span>
                </div>
                <span className="text-neo-black/60 font-bold text-[10px] uppercase tracking-widest">
                  {t('multiplayerFlow.roomList.instantMatch') || 'Instant Matchmaking'}
                </span>
              </m.button>

              <button
                onClick={onCreateRoom}
                className="mt-4 text-slate-400 hover:text-neo-pink font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime rounded px-2 py-1"
              >
                {t('multiplayerFlow.roomList.orCreateCustom') || 'or create a custom room'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </m.section>
          )}
          </div>

          {/* Right Column: Active Battles */}
          <div className="grid gap-6">
          {/* Active Battles Section */}
          <m.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-3 mb-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-neo-display font-black uppercase text-xs tracking-widest text-white/50">
                {t('multiplayerFlow.roomList.activeBattles') || 'Active Battles'}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan ms-2">
                    ({totalPlayers} {t('multiplayerFlow.roomList.online')})
                  </span>
                )}
              </h2>
              <button
                onClick={onRefreshRooms}
                disabled={roomsLoading}
                className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border-2 border-neo-black/50 bg-neo-navy/50 hover:bg-neo-cyan/20 active:translate-y-0.5 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
                aria-label={t('common.refresh')}
              >
                {roomsLoading ? (
                  <Loader size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-neo-cream" />
                )}
              </button>
            </div>

            {roomsLoading && activeRooms.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <PageLoader size="sm" />
              </div>
            ) : hasRooms ? (
              <div className="flex flex-col gap-2">
                {activeRooms.map((room, index) => (
                  <m.button
                    key={room.gameCode}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.03 }}
                    onClick={() => onRoomClick(room)}
                    whileHover={{ scale: 1.02, x: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black bg-neo-navy/60 shadow-hard-sm hover:shadow-hard hover:bg-neo-cyan/15 hover:border-neo-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime transition-all text-left group"
                  >
                    <span className="text-xl">
                      {LANGUAGE_FLAGS[room.language] || '🎮'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-neo-white truncate">
                        {room.roomName || room.gameCode}
                      </p>
                      <p className="text-xs text-slate-400">
                        {room.playerCount || 0} {t('joinView.players')}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 text-xs font-bold text-neo-black bg-neo-cyan rounded-neo border-2 border-neo-black shadow-hard-sm group-hover:shadow-hard group-hover:-translate-y-0.5 transition-all">
                      {t('common.join')}
                    </span>
                  </m.button>
                ))}
              </div>
            ) : (
              /* Empty State: No active rooms */
              <div className="bg-neo-navy-light/30 border-2 border-white/5 rounded-2xl p-6 flex flex-col items-center text-center">
                <Ghost className="w-10 h-10 text-white/10 mb-3" />
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                  {t('multiplayerFlow.roomList.noRooms')}
                </h3>
                <p className="text-slate-600 text-[9px] mt-1 font-bold uppercase">
                  {t('multiplayerFlow.roomList.beFirst')}
                </p>
              </div>
            )}
          </m.section>
          </div>
          </div>
        </div>

        {/* How to Play Dialog */}
        <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
          <DialogContent
            noDescription
            className="max-w-md sm:max-w-lg max-h-[85vh] overflow-hidden p-0 bg-neo-navy border-neo-black/50"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{t('landing.tutorial')}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[80vh]">
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default RoomListView;
