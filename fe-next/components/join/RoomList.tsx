'use client';

import React from 'react';
import { m } from 'framer-motion';
import { RefreshCw, Crown, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ActiveRoom } from '@/shared/types/game';

interface RoomListProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  selectedGameCode: string;
  onRoomSelect: (roomCode: string) => void;
  onRefresh: () => void;
  onSwitchToHostMode: () => void;
  isJoinMode: boolean;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  /** Compact mode - minimal header, fills container height */
  compact?: boolean;
}

/**
 * Panel displaying list of active game rooms
 */
export const RoomList: React.FC<RoomListProps> = ({
  activeRooms,
  roomsLoading,
  selectedGameCode,
  onRoomSelect,
  onRefresh,
  onSwitchToHostMode,
  isJoinMode,
  mobileExpanded,
  onToggleMobileExpand,
  compact = false,
}) => {
  const { t } = useLanguage();

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case 'he': return '🇮🇱';
      case 'sv': return '🇸🇪';
      case 'ja': return '🇯🇵';
      case 'es': return '🇪🇸';
      default: return '🇺🇸';
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'he': return t('joinView.hebrew');
      case 'sv': return t('joinView.swedish');
      case 'ja': return t('joinView.japanese');
      case 'es': return t('joinView.spanish');
      default: return t('joinView.english');
    }
  };

  // Compact mode: No Card wrapper, minimal header
  if (compact) {
    return (
      <div className="h-full flex flex-col rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard overflow-hidden">
        {/* Compact header - inline title + badge + refresh */}
        <button
          type="button"
          className="flex items-center justify-between gap-2 p-3 border-b-2 border-neo-black/30 cursor-pointer md:cursor-default w-full appearance-none bg-transparent text-left"
          onClick={onToggleMobileExpand}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-neo-white text-sm uppercase truncate">
              {t('joinView.roomsList')}
            </span>
            {activeRooms.length > 0 && (
              <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black text-xs shrink-0">
                {activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0)} {t('joinView.playersOnline')}
              </Badge>
            )}
            <span className="md:hidden text-slate-400 text-xs shrink-0">
              {mobileExpanded ? '▲' : '▼'}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  className="h-11 w-11 min-w-[44px] min-h-[44px] p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.refresh')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </button>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-auto p-3 transition-all duration-300",
          "md:block",
          mobileExpanded ? "block" : "hidden md:block"
        )}>
          {roomsLoading ? (
            <LoadingSkeleton />
          ) : activeRooms.length === 0 ? (
            <EmptyRoomsState
              isJoinMode={isJoinMode}
              onSwitchToHostMode={onSwitchToHostMode}
              t={t}
            />
          ) : (
            <div className="space-y-2">
              {activeRooms.map((room) => (
                <button
                  key={room.gameCode}
                  onClick={() => onRoomSelect(room.gameCode)}
                  className={cn(
                    "w-full p-2.5 rounded-neo text-left transition-all duration-100 border-3",
                    selectedGameCode === room.gameCode
                      ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                      : "bg-neo-navy border-neo-cream/50 text-neo-white shadow-hard-sm hover:shadow-hard hover:-translate-x-px hover:-translate-y-px hover:border-neo-cyan"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl" title={getLanguageLabel(room.language || 'en')}>
                        {getLanguageFlag(room.language || 'en')}
                      </span>
                      <div className="min-w-0">
                        <div className={cn(
                          "font-black text-base truncate",
                          selectedGameCode === room.gameCode ? "text-neo-black" : "text-neo-white"
                        )}>
                          {room.roomName || room.gameCode}
                        </div>
                        <div className={cn(
                          "text-xs font-bold",
                          selectedGameCode === room.gameCode ? "text-neo-black/90" : "text-neo-white"
                        )}>
                          {room.gameCode}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-neo-cyan text-neo-black border-2 border-neo-black text-xs shrink-0">
                      {room.playerCount}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original full mode with Card wrapper
  return (
    <m.div
      initial={{ x: -50, opacity: 0, rotate: 2 }}
      animate={{ x: 0, opacity: 1, rotate: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 relative z-10"
    >
      <Card className="flex h-full flex-col">
        {/* Mobile: Clickable header to expand/collapse */}
        <CardHeader
          className="md:cursor-default cursor-pointer"
          onClick={onToggleMobileExpand}
        >
          <div className="flex h-full justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>{t('joinView.roomsList')}</CardTitle>
              {/* Social proof: Show total players online */}
              {activeRooms.length > 0 && (
                <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black">
                  {activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0)} {t('joinView.playersOnline')}
                </Badge>
              )}
              {/* Mobile: Expand/collapse indicator */}
              <span className="md:hidden text-slate-500 dark:text-slate-300 text-sm">
                {mobileExpanded ? '▲' : '▼'}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                  >
                    <RefreshCw />
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
            <EmptyRoomsState
              isJoinMode={isJoinMode}
              onSwitchToHostMode={onSwitchToHostMode}
              t={t}
            />
          ) : (
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <button
                  key={room.gameCode}
                  onClick={() => onRoomSelect(room.gameCode)}
                  className={cn(
                    "w-full p-3 rounded-neo text-left transition-all duration-100 border-3",
                    selectedGameCode === room.gameCode
                      ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                      : "bg-neo-navy border-neo-cream/50 text-neo-white shadow-hard-sm hover:shadow-hard hover:-translate-x-px hover:-translate-y-px hover:border-neo-cyan"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" title={getLanguageLabel(room.language || 'en')}>
                        {getLanguageFlag(room.language || 'en')}
                      </span>
                      <div>
                        <div className={cn(
                          "font-black text-lg",
                          selectedGameCode === room.gameCode ? "text-neo-black" : "text-neo-white"
                        )}>
                          {room.roomName || room.gameCode}
                        </div>
                        <div className={cn(
                          "text-xs font-bold",
                          selectedGameCode === room.gameCode ? "text-neo-black/90" : "text-neo-white"
                        )}>
                          {t('joinView.host')}: {room.gameCode}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-neo-cyan text-neo-black border-2 border-neo-black">
                      {room.playerCount} {t('joinView.players')}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </m.div>
  );
};

/**
 * Enhanced skeleton loader for room list
 * Uses CSS skeleton classes for consistent shimmer animation
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3" role="status" aria-label="Loading rooms">
    {[1, 2, 3].map((i) => (
      <div
        key={`room-skeleton-${i}`}
        className="w-full p-3 rounded-neo border-3 border-neo-cream/20 skeleton"
        style={{ animationDelay: `${i * 0.15}s` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Flag skeleton */}
            <div className="w-8 h-8 rounded-neo bg-neo-cream/10 text-neo-black" />
            <div>
              {/* Room name skeleton */}
              <div className="h-5 w-28 rounded-neo bg-neo-cream/15 text-neo-black mb-1" />
              {/* Host code skeleton */}
              <div className="h-3 w-20 rounded-neo bg-neo-cream/10 text-neo-black" />
            </div>
          </div>
          {/* Player count badge skeleton */}
          <div className="h-6 w-20 rounded-md bg-neo-cream/15 text-neo-black" />
        </div>
      </div>
    ))}
    <span className="sr-only">Loading available rooms...</span>
  </div>
);

interface EmptyRoomsStateProps {
  isJoinMode: boolean;
  onSwitchToHostMode: () => void;
  t: (key: string) => string;
}

const EmptyRoomsState: React.FC<EmptyRoomsStateProps> = ({
  isJoinMode,
  onSwitchToHostMode,
  t,
}) => (
  <div className="text-center py-6 text-neo-white space-y-4">
    {isJoinMode && (
      <m.div whileHover={{ x: -2, y: -2 }} whileTap={{ x: 2, y: 2 }}>
        <Button
          onClick={onSwitchToHostMode}
          className="bg-neo-pink text-neo-white"
        >
          <span className="me-2"><Crown /></span>
          {t('joinView.createRoom')}
        </Button>
      </m.div>
    )}
    <div className="flex justify-center">
      <Gamepad2 size={48} className="text-neo-white" />
    </div>
    <div>
      <p className="text-base font-bold uppercase">{t('joinView.noRooms')}</p>
    </div>
  </div>
);

export default RoomList;
