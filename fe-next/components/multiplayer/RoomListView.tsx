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
import { NeoLoader } from '@/components/ui/NeoLoader';
import QuickPlayButton from './QuickPlayButton';

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
 * RoomListView - Simplified multiplayer landing screen
 * Features Quick Play hero action at top, simplified room list
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
        className="screen-fit bg-gradient-to-b from-transparent via-neo-navy-light to-transparent relative overflow-hidden flex flex-col"
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />

        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-between py-2 px-3 lg:px-4 flex-shrink-0"
        >
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-slate-600 bg-slate-700/50 shadow-hard-sm hover:bg-slate-600/50 transition-all text-neo-cream text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Link>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-black uppercase text-neo-white">
            {t('landing.multiplayer')}
          </h1>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-2 rounded-neo border-2 border-slate-600 bg-slate-700/50 hover:bg-neo-purple/30 transition-all"
            aria-label={t('landing.tutorial')}
          >
            <HelpCircle className="w-5 h-5 text-neo-cream" />
          </button>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col px-3 lg:px-4 py-3 min-h-0 gap-4 overflow-hidden">
          {/* Hero: Quick Play Button */}
          {onQuickPlay && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-shrink-0"
            >
              <QuickPlayButton
                onQuickPlay={onQuickPlay}
                isLoading={isQuickPlayLoading}
                t={t}
                variant="hero"
              />
            </motion.div>
          )}

          {/* Divider with "or join a room" */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3 flex-shrink-0"
          >
            <div className="flex-1 h-px bg-slate-600" />
            <span className="text-sm text-slate-400 font-medium uppercase">
              {t('multiplayerFlow.roomList.orJoinRoom') || 'or join a room'}
            </span>
            <div className="flex-1 h-px bg-slate-600" />
          </motion.div>

          {/* Room List Section */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Room List Header */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between mb-2 flex-shrink-0"
            >
              <h3 className="text-sm font-bold uppercase text-neo-cream/70 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('multiplayerFlow.roomList.activeRooms')}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan text-xs">
                    ({totalPlayers} {t('multiplayerFlow.roomList.online')})
                  </span>
                )}
              </h3>
              <button
                onClick={onRefreshRooms}
                disabled={roomsLoading}
                className="p-1.5 rounded border border-slate-600 bg-slate-700/30 hover:bg-neo-cyan/20 transition-all disabled:opacity-50"
                aria-label={t('common.refresh')}
              >
                {roomsLoading ? (
                  <NeoLoader variant="dots" size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-neo-cream" />
                )}
              </button>
            </motion.div>

            {/* Room List - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {roomsLoading && activeRooms.length === 0 ? (
                <div className="h-24 flex items-center justify-center">
                  <NeoLoader variant="mascot-letters" size="sm" />
                </div>
              ) : hasRooms ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-col gap-2"
                >
                  {activeRooms.map((room, index) => (
                    <motion.button
                      key={room.gameCode}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + index * 0.03 }}
                      onClick={() => onRoomClick(room)}
                      className="flex items-center gap-3 p-3 rounded-neo border-2 border-slate-600 bg-slate-700/40 hover:bg-neo-cyan/15 hover:border-neo-cyan/50 transition-all text-left group"
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
                      <span className="px-3 py-1.5 text-xs font-bold text-neo-black bg-neo-cyan rounded border-2 border-neo-black shadow-hard-sm group-hover:shadow-hard transition-all">
                        {t('common.join')}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                /* Empty State - Simplified */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-col items-center justify-center text-center py-6"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-neo-cream/60 mb-1">
                    {t('multiplayerFlow.roomList.noRooms')}
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    {t('multiplayerFlow.roomList.beFirst')}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Create Room Button - Subtle at bottom */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-shrink-0 pt-3"
            >
              <Button
                variant="outline"
                onClick={onCreateRoom}
                className="w-full py-3 text-sm font-bold uppercase border-2 border-slate-600 bg-slate-700/30 hover:bg-neo-lime/20 hover:border-neo-lime/50 text-neo-cream"
              >
                <Plus className="w-4 h-4 me-2" />
                {t('multiplayerFlow.roomList.createButton')}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* How to Play Dialog */}
        <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
          <DialogContent noDescription className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('landing.tutorial')}</DialogTitle>
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
