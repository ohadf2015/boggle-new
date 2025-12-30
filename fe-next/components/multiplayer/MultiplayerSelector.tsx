'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Crown, LogIn, ArrowLeft, Users } from 'lucide-react';
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

      <div dir={dir} className="min-h-screen h-screen bg-gradient-to-b from-neo-navy via-neo-navy-light to-neo-navy flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 lg:py-10 xl:py-12 flex-shrink-0 px-4 lg:px-8"
        >
          <Link
            href="/"
            className="absolute start-4 lg:start-8 xl:start-12 flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-3 rounded-neo lg:rounded-neo-lg border-3 lg:border-4 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard lg:shadow-hard-lg hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm lg:text-base xl:text-lg font-bold"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black uppercase text-center text-neo-white">
            {t('landing.multiplayer') || 'Multiplayer'}
          </h1>
        </motion.div>

        {/* Main Content - Decision Cards */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-12 xl:px-16 pb-4 lg:pb-8 min-h-0 gap-4 lg:gap-8 xl:gap-10">
          {/* Active Rooms Preview - Positioned at top for visibility */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-2 lg:mb-4">
              <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold uppercase text-neo-cream/70 flex items-center gap-2 lg:gap-3">
                <Users className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6" />
                {t('multiplayerFlow.selector.activeRoomsPreview') || 'Active Rooms'}
                {totalPlayers > 0 && (
                  <span className="text-neo-cyan">({totalPlayers} {t('multiplayerFlow.selector.playersOnline') || 'online'})</span>
                )}
              </h3>
            </div>

            {roomsLoading ? (
              <div className="h-16 lg:h-20 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 lg:w-8 lg:h-8 border-2 lg:border-3 border-neo-cyan border-t-transparent rounded-full" />
              </div>
            ) : previewRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                {previewRooms.map((room) => (
                  <button
                    key={room.gameCode}
                    onClick={() => onQuickJoin(room.gameCode)}
                    className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 xl:p-5 rounded-neo lg:rounded-neo-lg border-2 lg:border-3 border-slate-600 bg-slate-700/50 hover:bg-neo-cyan/20 hover:border-neo-cyan transition-all text-left group"
                  >
                    <span className="text-lg lg:text-xl xl:text-2xl">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm lg:text-base xl:text-lg text-neo-white truncate">
                        {room.roomName || room.gameCode}
                      </p>
                      <p className="text-xs lg:text-sm text-slate-300">
                        {room.playerCount || 0} {t('joinView.players') || 'players'}
                      </p>
                    </div>
                    <span className="px-3 py-1 lg:px-4 lg:py-1.5 text-xs lg:text-sm font-bold text-neo-black bg-neo-cyan rounded-neo border-2 border-neo-black shadow-hard-sm group-hover:shadow-hard group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-all">
                      {t('common.join') || 'Join'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 lg:py-5 text-sm lg:text-base xl:text-lg text-neo-cream/80">
                {t('multiplayerFlow.selector.noRooms') || 'No active rooms - be the first to create one!'}
              </div>
            )}
          </motion.div>

          {/* Cards Container */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 xl:gap-10 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex-shrink-0">
            {/* Create Room Card */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <Card
                className="h-full cursor-pointer group border-3 lg:border-4 border-slate-600 shadow-hard lg:shadow-hard-lg hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all bg-gradient-to-br from-neo-lime/10 to-neo-lime/5"
                onClick={onSelectCreate}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectCreate()}
                aria-label={t('multiplayerFlow.selector.createCard.title') || 'Create Room'}
              >
                <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8 lg:p-10 xl:p-12 h-full min-h-[180px] sm:min-h-[220px] lg:min-h-[280px] xl:min-h-[320px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-full bg-neo-lime text-neo-black border-3 lg:border-4 border-neo-black flex items-center justify-center mb-4 lg:mb-6 shadow-hard lg:shadow-hard-lg group-hover:scale-110 transition-transform">
                    <Crown className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-neo-black" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black uppercase text-neo-white mb-2 lg:mb-3">
                    {t('multiplayerFlow.selector.createCard.title') || 'Create Room'}
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-neo-cream mb-4 lg:mb-6">
                    {t('multiplayerFlow.selector.createCard.description') || 'Host a new game and invite friends'}
                  </p>
                  <Button
                    variant="success"
                    size="lg"
                    className="w-full max-w-[200px] lg:max-w-[260px] xl:max-w-[300px] font-bold uppercase lg:text-lg xl:text-xl lg:py-3 xl:py-4"
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
              transition={{ delay: 0.3 }}
              className="flex-1"
            >
              <Card
                className="h-full cursor-pointer group border-3 lg:border-4 border-slate-600 shadow-hard lg:shadow-hard-lg hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all bg-gradient-to-br from-neo-cyan/10 to-neo-cyan/5"
                onClick={onSelectJoin}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectJoin()}
                aria-label={t('multiplayerFlow.selector.joinCard.title') || 'Join Room'}
              >
                <CardContent className="flex flex-col items-center justify-center text-center p-6 sm:p-8 lg:p-10 xl:p-12 h-full min-h-[180px] sm:min-h-[220px] lg:min-h-[280px] xl:min-h-[320px]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-full bg-neo-cyan text-neo-black border-3 lg:border-4 border-neo-black flex items-center justify-center mb-4 lg:mb-6 shadow-hard lg:shadow-hard-lg group-hover:scale-110 transition-transform">
                    <LogIn className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-neo-black" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black uppercase text-neo-white mb-2 lg:mb-3">
                    {t('multiplayerFlow.selector.joinCard.title') || 'Join Room'}
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-neo-cream mb-4 lg:mb-6">
                    {t('multiplayerFlow.selector.joinCard.description') || 'Enter an existing game with a code'}
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full max-w-[200px] lg:max-w-[260px] xl:max-w-[300px] font-bold uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black lg:text-lg xl:text-xl lg:py-3 xl:py-4"
                    tabIndex={-1}
                  >
                    {t('multiplayerFlow.selector.joinCard.button') || 'Browse Rooms'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiplayerSelector;
