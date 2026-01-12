'use client';

import React, { useCallback, useState } from 'react';
import { Share2, LogOut, Trophy } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import UnifiedShareModal from '../modals/UnifiedShareModal';
import { useNativeShare } from '../../hooks/useNativeShare';
import { getJoinUrl } from '../../utils/share';
import type { Language } from '@/shared/types/game';

// ==================== Types ====================

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
}

interface GameRoomHeaderProps {
  gameCode: string;
  roomLanguage: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  onExitRoom: () => void;
  isHost?: boolean;
  tournamentData?: TournamentData | null;
  showRoomName?: boolean;
}

// ==================== Language Display ====================

const getLanguageDisplay = (language: Language): string => {
  switch (language) {
    case 'he':
      return '🇮🇱 עברית';
    case 'sv':
      return '🇸🇪 Svenska';
    case 'ja':
      return '🇯🇵 日本語';
    case 'es':
      return '🇪🇸 Español';
    case 'fr':
      return '🇫🇷 Français';
    case 'de':
      return '🇩🇪 Deutsch';
    default:
      return '🇺🇸 English';
  }
};

// ==================== Component ====================

/**
 * GameRoomHeader - Shared header component for host and player pre-game views
 * Displays room code, language, share functionality, and exit button
 */
const GameRoomHeader: React.FC<GameRoomHeaderProps> = ({
  gameCode,
  roomLanguage,
  username,
  t,
  onExitRoom,
  isHost = false,
  tournamentData,
  showRoomName = true,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const { canNativeShare, nativeShare } = useNativeShare();

  // Share handler - uses native share on mobile, modal on desktop
  const handleShare = useCallback(async () => {
    if (canNativeShare) {
      const joinUrl = getJoinUrl(gameCode, 'native-share');
      const shared = await nativeShare({
        title: t('share.inviteTitle'),
        text: t('share.inviteMessage'),
        url: joinUrl,
      });
      // If native share was cancelled, show modal as fallback
      if (!shared) {
        setIsShareModalOpen(true);
      }
    } else {
      // Desktop: show unified modal
      setIsShareModalOpen(true);
    }
  }, [canNativeShare, nativeShare, gameCode, t]);

  return (
    <>
      <Card className="bg-slate-800/95 text-neo-white px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-neo-black shadow-hard">
        <div className="flex items-center justify-between gap-2">
          {/* Exit Button + Room Code and Language */}
          <div className="flex items-center gap-2">
            {/* Exit Button */}
            <button
              onClick={onExitRoom}
              className="flex items-center gap-1 px-2 py-1 bg-neo-red text-white font-bold text-xs rounded-neo border-2 border-red-700 shadow-hard-sm hover:shadow-hard hover:bg-red-600 active:shadow-none transition-all"
              title={isHost ? t('hostView.exitRoom') : t('playerView.exitRoom')}
            >
              <LogOut className="text-xs" />
              <span className="hidden sm:inline">
                {isHost ? t('hostView.exitRoom') : t('playerView.exitRoom')}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-wide text-neo-lime">
                {gameCode}
              </span>
            </div>
            <Badge className="text-xs px-1.5 py-0 bg-neo-cream text-neo-black border border-neo-black font-semibold">
              {getLanguageDisplay(roomLanguage)}
            </Badge>
            {/* Room Name - only show for host or when explicitly enabled */}
            {showRoomName && isHost && (
              <span className="text-xs text-neo-cream/70 font-medium hidden md:inline truncate max-w-[150px]">
                {username}&apos;s Room
              </span>
            )}
            {tournamentData && (
              <Badge className="text-xs px-2 py-0 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                <Trophy className="mr-1 text-[10px]" />
                R{tournamentData.currentRound}/{tournamentData.totalRounds}
              </Badge>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-cream text-neo-black font-bold text-sm rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:shadow-none active:translate-y-0 transition-all"
          >
            <Share2 className="text-xs" />
            <span>{t('share.buttonLabel')}</span>
          </button>
        </div>
      </Card>

      {/* Unified Share Modal */}
      <UnifiedShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameCode={gameCode}
        t={t}
      />
    </>
  );
};

export default GameRoomHeader;
