'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaCrown, FaSignInAlt, FaArrowLeft, FaUsers } from 'react-icons/fa';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ActiveRoom, Language } from '@/shared/types/game';
import LandscapeIndicator from '@/components/LandscapeIndicator';

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

interface MultiplayerSelectorProps {
  onSelectCreate: () => void;
  onSelectJoin: () => void;
  activeRooms: ActiveRoom[];
  onQuickJoin: (roomCode: string) => void;
  roomsLoading: boolean;
}

/**
 * MultiplayerSelector - Landing screen with large Create/Join decision cards
 * First screen in the new multiplayer flow - clear binary choice
 */
const MultiplayerSelector: React.FC<MultiplayerSelectorProps> = ({
  onSelectCreate,
  onSelectJoin,
  activeRooms,
  onQuickJoin,
  roomsLoading,
}) => {
  const { t, dir } = useLanguage();

  // Show up to 3 rooms in preview
  const previewRooms = activeRooms.slice(0, 3);
  const totalPlayers = activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0);

  return (
    <>
      <LandscapeIndicator />

      <div dir={dir} className="min-h-screen h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 flex-shrink-0 px-4"
        >
          <Link
            href="/"
            className="absolute start-4 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold"
          >
            <FaArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-center text-neo-black dark:text-neo-white">
            {t('landing.multiplayer') || 'Multiplayer'}
          </h1>
        </motion.div>

        {/* Main Content - Decision Cards */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 pb-4 min-h-0 gap-4 lg:gap-6">
          {/* Cards Container */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full max-w-4xl mx-auto flex-shrink-0">
            {/* Create Room Card */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <Card
                className="h-full cursor-pointer group border-3 border-neo-black dark:border-slate-600 shadow-hard hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all bg-gradient-to-br from-neo-lime/20 to-neo-lime/5 dark:from-neo-lime/10 dark:to-neo-lime/5"
                onClick={onSelectCreate}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectCreate()}
                aria-label={t('multiplayerFlow.selector.createCard.title') || 'Create Room'}
              >
                <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8 h-full min-h-[180px] sm:min-h-[220px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neo-lime border-3 border-neo-black flex items-center justify-center mb-4 shadow-hard group-hover:scale-110 transition-transform">
                    <FaCrown className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-black dark:text-neo-white mb-2">
                    {t('multiplayerFlow.selector.createCard.title') || 'Create Room'}
                  </h2>
                  <p className="text-sm sm:text-base text-neo-black/70 dark:text-neo-cream/70 mb-4">
                    {t('multiplayerFlow.selector.createCard.description') || 'Host a new game and invite friends'}
                  </p>
                  <Button
                    variant="success"
                    size="lg"
                    className="w-full max-w-[200px] font-bold uppercase"
                    tabIndex={-1}
                  >
                    {t('multiplayerFlow.selector.createCard.button') || 'Start Setup'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Join Room Card */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <Card
                className="h-full cursor-pointer group border-3 border-neo-black dark:border-slate-600 shadow-hard hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all bg-gradient-to-br from-neo-cyan/20 to-neo-cyan/5 dark:from-neo-cyan/10 dark:to-neo-cyan/5"
                onClick={onSelectJoin}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectJoin()}
                aria-label={t('multiplayerFlow.selector.joinCard.title') || 'Join Room'}
              >
                <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8 h-full min-h-[180px] sm:min-h-[220px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neo-cyan border-3 border-neo-black flex items-center justify-center mb-4 shadow-hard group-hover:scale-110 transition-transform">
                    <FaSignInAlt className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-black dark:text-neo-white mb-2">
                    {t('multiplayerFlow.selector.joinCard.title') || 'Join Room'}
                  </h2>
                  <p className="text-sm sm:text-base text-neo-black/70 dark:text-neo-cream/70 mb-4">
                    {t('multiplayerFlow.selector.joinCard.description') || 'Enter an existing game with a code'}
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full max-w-[200px] font-bold uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black"
                    tabIndex={-1}
                  >
                    {t('multiplayerFlow.selector.joinCard.button') || 'Browse Rooms'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Active Rooms Preview */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-4xl mx-auto flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm sm:text-base font-bold uppercase text-neo-black/70 dark:text-neo-cream/70 flex items-center gap-2">
                <FaUsers className="w-4 h-4" />
                {t('multiplayerFlow.selector.activeRoomsPreview') || 'Active Rooms'}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan">({totalPlayers} {t('multiplayerFlow.selector.playersOnline') || 'online'})</span>
                )}
              </h3>
            </div>

            {roomsLoading ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-neo-cyan border-t-transparent rounded-full" />
              </div>
            ) : previewRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {previewRooms.map((room) => (
                  <button
                    key={room.gameCode}
                    onClick={() => onQuickJoin(room.gameCode)}
                    className="flex items-center gap-2 p-3 rounded-neo border-2 border-neo-black/30 dark:border-slate-600 bg-neo-cream/50 dark:bg-slate-700/50 hover:bg-neo-cyan/20 hover:border-neo-cyan transition-all text-left group"
                  >
                    <span className="text-lg">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-neo-black dark:text-neo-white truncate">
                        {room.roomName || room.gameCode}
                      </p>
                      <p className="text-xs text-neo-black/60 dark:text-neo-cream/60">
                        {room.playerCount || 0} {t('joinView.players') || 'players'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-neo-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('common.join') || 'Join'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-sm text-neo-black/50 dark:text-neo-cream/50">
                {t('multiplayerFlow.selector.noRooms') || 'No active rooms - be the first to create one!'}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MultiplayerSelector;
