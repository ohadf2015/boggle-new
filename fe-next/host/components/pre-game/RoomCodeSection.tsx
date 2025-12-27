'use client';

import React, { memo, useState, useCallback } from 'react';
import { FaShareAlt, FaTrophy } from 'react-icons/fa';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import UnifiedShareModal from '../../../components/modals/UnifiedShareModal';
import { useNativeShare } from '../../../hooks/useNativeShare';
import { getJoinUrl } from '../../../utils/share';
import type { Language } from '@/shared/types/game';

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

interface RoomCodeSectionProps {
  gameCode: string;
  roomLanguage: Language;
  roomName?: string;
  tournamentData: TournamentData | null;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * RoomCodeSection - Displays room code, language, and single share button
 * Uses native share on mobile, shows unified modal on desktop
 */
export const RoomCodeSection = memo<RoomCodeSectionProps>(({
  gameCode,
  roomLanguage,
  roomName = '',
  tournamentData,
  t,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { canNativeShare, nativeShare } = useNativeShare();

  const handleShare = useCallback(async () => {
    if (canNativeShare) {
      const joinUrl = getJoinUrl(gameCode, 'native-share');
      const shared = await nativeShare({
        title: t('share.inviteTitle'),
        text: t('share.inviteMessage'),
        url: joinUrl,
      });
      // If native share was cancelled or failed, show modal as fallback
      if (!shared) {
        setIsShareModalOpen(true);
      }
    } else {
      // Desktop: show unified modal
      setIsShareModalOpen(true);
    }
  }, [canNativeShare, nativeShare, gameCode, t]);

  const getLanguageDisplay = (lang: Language) => {
    switch (lang) {
      case 'he': return '🇮🇱 עברית';
      case 'sv': return '🇸🇪 Svenska';
      case 'ja': return '🇯🇵 日本語';
      default: return '🇺🇸 English';
    }
  };

  return (
    <>
      <Card className="bg-slate-800/95 text-neo-white px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-neo-black shadow-hard">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code and Language */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neo-cyan font-bold uppercase hidden sm:inline">{t('hostView.roomCode')}:</span>
              <span className="text-lg sm:text-xl font-black tracking-wide text-neo-yellow">
                {gameCode}
              </span>
            </div>
            <Badge className="text-xs px-1.5 py-0 bg-neo-cream text-neo-black border border-neo-black font-semibold">
              {getLanguageDisplay(roomLanguage)}
            </Badge>
            {tournamentData && (
              <Badge className="text-xs px-2 py-0 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                <FaTrophy className="mr-1 text-[10px]" />
                R{tournamentData.currentRound}/{tournamentData.totalRounds}
              </Badge>
            )}
          </div>

          {/* Single Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-cyan text-neo-black font-bold text-sm rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:shadow-none active:translate-y-0 transition-all"
          >
            <FaShareAlt className="text-xs" />
            <span>{t('share.buttonLabel')}</span>
          </button>
        </div>
      </Card>

      {/* Unified Share Modal */}
      <UnifiedShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameCode={gameCode}
        roomName={roomName}
        t={t}
      />
    </>
  );
});

RoomCodeSection.displayName = 'RoomCodeSection';

export default RoomCodeSection;
