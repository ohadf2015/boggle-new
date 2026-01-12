'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, Plus, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import HowToPlay from '@/components/HowToPlay';

interface RoomListViewProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
}

/**
 * RoomListView - Main view showing active rooms with Create Room button at bottom
 * Replaces MultiplayerSelector as the primary multiplayer landing screen
 */
const RoomListView: React.FC<RoomListViewProps> = ({
  activeRooms,
  roomsLoading,
  onRefreshRooms,
  onRoomClick,
  onCreateRoom,
}) => {
  const { t, dir } = useLanguage();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Pull-to-refresh for room list
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      onRefreshRooms();
      // Small delay to allow socket response
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
        className="screen-fit bg-gradient-to-b from-transparent via-neo-navy-light to-transparent relative overflow-hidden flex flex-col"
        {...pullToRefreshHandlers}
      >
        {/* Pull-to-refresh indicator */}
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-2 sm:py-2 lg:py-4 flex-shrink-0 px-2 sm:px-3 lg:px-4"
        >
          <Link
            href="/"
            className="absolute start-4 lg:start-8 xl:start-12 flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-3 rounded-neo lg:rounded-neo-lg border-3 lg:border-4 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard lg:shadow-hard-lg hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm lg:text-base xl:text-lg font-bold"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black uppercase text-center text-neo-white">
            {t('landing.multiplayer') || 'Multiplayer'}
          </h1>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col px-2 sm:px-3 lg:px-4 pt-2 sm:pt-3 lg:pt-4 pb-24 lg:pb-28 min-h-0 gap-3 lg:gap-4 overflow-hidden">
          {/* Room List Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-between flex-shrink-0"
          >
            <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold uppercase text-neo-cream/70 flex items-center gap-2 lg:gap-3">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6" />
              {t('multiplayerFlow.roomList.activeRooms') || 'Active Rooms'}
              {totalPlayers > 0 && (
                <span className="text-neo-cyan">
                  ({totalPlayers} {t('multiplayerFlow.roomList.online') || 'online'})
                </span>
              )}
            </h3>
            <button
              onClick={onRefreshRooms}
              disabled={roomsLoading}
              className="p-2 lg:p-3 rounded-neo border-2 border-slate-600 bg-slate-700/50 hover:bg-neo-cyan/20 hover:border-neo-cyan transition-all disabled:opacity-50"
              aria-label={t('common.refresh') || 'Refresh'}
            >
              <RefreshCw
                className={`w-4 h-4 lg:w-5 lg:h-5 text-neo-cream ${roomsLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </motion.div>

          {/* Room List - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {roomsLoading && activeRooms.length === 0 ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 lg:w-10 lg:h-10 border-3 lg:border-4 border-neo-cyan border-t-transparent rounded-full" />
              </div>
            ) : hasRooms ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-2 sm:gap-3 lg:gap-4"
              >
                {activeRooms.map((room, index) => (
                  <motion.button
                    key={room.gameCode}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => onRoomClick(room)}
                    className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 xl:p-6 rounded-neo lg:rounded-neo-lg border-3 lg:border-4 border-slate-600 bg-slate-700/50 hover:bg-neo-cyan/20 hover:border-neo-cyan transition-all text-left group"
                  >
                    <span className="text-2xl lg:text-3xl xl:text-4xl">
                      {LANGUAGE_FLAGS[room.language] || '🎮'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base lg:text-lg xl:text-xl text-neo-white truncate">
                        {room.roomName || room.gameCode}
                      </p>
                      <p className="text-sm lg:text-base text-slate-300">
                        {room.playerCount || 0} {t('joinView.players') || 'players'}
                      </p>
                    </div>
                    <span className="px-4 py-2 lg:px-5 lg:py-2.5 text-sm lg:text-base font-bold text-neo-black bg-neo-cyan rounded-neo border-2 lg:border-3 border-neo-black shadow-hard-sm group-hover:shadow-hard group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-all">
                      {t('common.join') || 'Join'}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="h-full flex flex-col items-center justify-center text-center py-8 lg:py-12"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-700/50 border-3 border-slate-600 flex items-center justify-center mb-4 lg:mb-6">
                  <Users className="w-8 h-8 lg:w-10 lg:h-10 text-slate-400" />
                </div>
                <p className="text-lg lg:text-xl xl:text-2xl text-neo-cream/80 mb-2">
                  {t('multiplayerFlow.roomList.noRooms') || 'No active rooms'}
                </p>
                <p className="text-sm lg:text-base text-slate-400 mb-6">
                  {t('multiplayerFlow.roomList.beFirst') || 'Be the first to create one!'}
                </p>
                {/* Centered Create Button for Empty State */}
                <Button
                  variant="success"
                  size="lg"
                  onClick={onCreateRoom}
                  className="px-8 lg:px-10 py-4 lg:py-5 text-base lg:text-lg font-bold uppercase"
                >
                  <Plus className="w-5 h-5 lg:w-6 lg:h-6 me-2" />
                  {t('multiplayerFlow.roomList.createButton') || 'Create Room'}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom (only when rooms exist) */}
          {hasRooms && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="fixed bottom-4 lg:bottom-6 left-2 right-2 sm:left-3 sm:right-3 lg:left-4 lg:right-4 z-10"
            >
              <div className="max-w-2xl mx-auto flex gap-2 lg:gap-3">
                {/* How to Play Button */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowHowToPlay(true)}
                  className="py-4 lg:py-5 text-base lg:text-lg font-bold uppercase shadow-hard-lg border-3 lg:border-4 border-neo-black bg-neo-purple hover:bg-neo-purple/90 text-neo-white"
                  aria-label={t('landing.tutorial') || 'How to Play'}
                >
                  <HelpCircle className="w-5 h-5 lg:w-6 lg:h-6" />
                  <span className="hidden sm:inline ms-2">{t('landing.tutorial') || 'How to Play'}</span>
                </Button>

                {/* Create Room Button */}
                <Button
                  variant="success"
                  size="lg"
                  onClick={onCreateRoom}
                  className="flex-1 py-4 lg:py-5 text-base lg:text-lg font-bold uppercase shadow-hard-lg"
                >
                  <Plus className="w-5 h-5 lg:w-6 lg:h-6 me-2" />
                  {t('multiplayerFlow.roomList.createButton') || 'Create Room'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* How to Play Dialog */}
        <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
          <DialogContent noDescription className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('landing.tutorial') || 'How to Play'}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[85vh]">
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default RoomListView;
