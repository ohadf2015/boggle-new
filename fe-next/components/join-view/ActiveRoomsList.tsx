'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSync, FaCrown, FaGamepad } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface ActiveRoom {
  gameCode: string;
  roomName: string;
  language: string;
  playerCount: number;
  gameState: string;
  isRanked: boolean;
  createdAt: number;
}

interface ActiveRoomsListProps {
  activeRooms: ActiveRoom[];
  selectedGameCode: string;
  roomsLoading: boolean;
  onRoomSelect: (roomCode: string) => void;
  onRefresh: () => void;
  onSwitchToHostMode: () => void;
  isJoinMode: boolean;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  he: '\u{1F1EE}\u{1F1F1}',
  sv: '\u{1F1F8}\u{1F1EA}',
  ja: '\u{1F1EF}\u{1F1F5}',
  en: '\u{1F1FA}\u{1F1F8}',
};

/**
 * ActiveRoomsList - Panel showing available game rooms
 */
const ActiveRoomsList: React.FC<ActiveRoomsListProps> = React.memo(({
  activeRooms,
  selectedGameCode,
  roomsLoading,
  onRoomSelect,
  onRefresh,
  onSwitchToHostMode,
  isJoinMode
}) => {
  const { t } = useLanguage();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const handleHeaderClick = useCallback(() => {
    setMobileExpanded(prev => !prev);
  }, []);

  const handleRefreshClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRefresh();
  }, [onRefresh]);

  const totalPlayers = activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0);

  const getLanguageTitle = useCallback((lang: string) => {
    const titles: Record<string, string> = {
      he: t('joinView.hebrew'),
      sv: t('joinView.swedish'),
      ja: t('joinView.japanese'),
      en: t('joinView.english'),
    };
    return titles[lang] || t('joinView.english');
  }, [t]);

  return (
    <motion.div
      initial={{ x: -50, opacity: 0, rotate: 2 }}
      animate={{ x: 0, opacity: 1, rotate: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 relative z-10"
    >
      <Card className="flex h-full flex-col">
        {/* Mobile: Clickable header to expand/collapse */}
        <CardHeader
          className="md:cursor-default cursor-pointer"
          onClick={handleHeaderClick}
        >
          <div className="flex h-full justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>{t('joinView.roomsList')}</CardTitle>
              {/* Social proof: Show total players online */}
              {activeRooms.length > 0 && (
                <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black">
                  {totalPlayers} {t('joinView.playersOnline')}
                </Badge>
              )}
              {/* Mobile: Expand/collapse indicator */}
              <span className="md:hidden text-slate-500 dark:text-slate-400 text-sm">
                {mobileExpanded ? '\u25B2' : '\u25BC'}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshClick}
                  >
                    <FaSync />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('common.refresh')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        {/* Content: Always visible on desktop, collapsible on mobile */}
        <CardContent className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          "md:block",
          mobileExpanded ? "block" : "hidden md:block"
        )}>
          {roomsLoading ? (
            <LoadingSkeleton />
          ) : activeRooms.length === 0 ? (
            <EmptyState
              isJoinMode={isJoinMode}
              onSwitchToHostMode={onSwitchToHostMode}
              t={t}
            />
          ) : (
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <RoomButton
                  key={room.gameCode}
                  room={room}
                  isSelected={selectedGameCode === room.gameCode}
                  onClick={() => onRoomSelect(room.gameCode)}
                  getLanguageTitle={getLanguageTitle}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

// Sub-components
const LoadingSkeleton: React.FC = React.memo(() => (
  <div className="space-y-2">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="w-full p-3 rounded-neo bg-neo-navy/50 border-3 border-neo-cream/20 animate-pulse"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neo-cream/20 rounded-neo" />
            <div>
              <div className="h-5 w-24 bg-neo-cream/20 rounded-neo mb-1" />
              <div className="h-3 w-16 bg-neo-cream/10 rounded-neo" />
            </div>
          </div>
          <div className="h-5 w-16 bg-neo-cream/20 rounded-neo" />
        </div>
      </div>
    ))}
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

interface EmptyStateProps {
  isJoinMode: boolean;
  onSwitchToHostMode: () => void;
  t: (key: string) => string;
}

const EmptyState: React.FC<EmptyStateProps> = React.memo(({ isJoinMode, onSwitchToHostMode, t }) => (
  <div className="text-center py-6 text-neo-cream/60 space-y-4">
    {isJoinMode && (
      <motion.div whileHover={{ x: -2, y: -2 }} whileTap={{ x: 2, y: 2 }}>
        <Button
          onClick={onSwitchToHostMode}
          className="bg-neo-pink text-neo-white"
        >
          <span className="mr-2"><FaCrown /></span>
          {t('joinView.createRoom')}
        </Button>
      </motion.div>
    )}
    <div className="flex justify-center">
      <FaGamepad size={48} className="text-neo-cream/30" />
    </div>
    <div>
      <p className="text-base font-bold uppercase text-black">{t('joinView.noRooms')}</p>
      <p className="text-sm mt-1 text-black/70">{t('joinView.createNewRoom')}</p>
    </div>
  </div>
));
EmptyState.displayName = 'EmptyState';

interface RoomButtonProps {
  room: ActiveRoom;
  isSelected: boolean;
  onClick: () => void;
  getLanguageTitle: (lang: string) => string;
  t: (key: string) => string;
}

const RoomButton: React.FC<RoomButtonProps> = React.memo(({
  room,
  isSelected,
  onClick,
  getLanguageTitle,
  t
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full p-3 rounded-neo text-left transition-all duration-100 border-3",
      isSelected
        ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
        : "bg-neo-navy border-neo-cream/50 text-neo-cream shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl" title={getLanguageTitle(room.language)}>
          {LANGUAGE_FLAGS[room.language] || LANGUAGE_FLAGS.en}
        </span>
        <div>
          <div className={cn("font-black text-lg", isSelected ? "text-neo-black" : "text-neo-cream")}>
            {room.roomName || room.gameCode}
          </div>
          <div className={cn("text-xs font-bold", isSelected ? "text-neo-black/60" : "text-neo-cream/60")}>
            {t('joinView.host')}: {room.gameCode}
          </div>
        </div>
      </div>
      <Badge className="bg-neo-cyan text-neo-black border-2 border-neo-black">
        {room.playerCount} {t('joinView.players')}
      </Badge>
    </div>
  </button>
));
RoomButton.displayName = 'RoomButton';

ActiveRoomsList.displayName = 'ActiveRoomsList';

export default ActiveRoomsList;
