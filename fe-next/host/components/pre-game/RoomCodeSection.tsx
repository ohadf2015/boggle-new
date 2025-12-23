'use client';

import React, { memo, useCallback } from 'react';
import { FaQrcode, FaWhatsapp, FaLink, FaTrophy } from 'react-icons/fa';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import ShareButton from '../../../components/ShareButton';
import { copyJoinUrl, shareViaWhatsApp } from '../../../utils/share';
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
  tournamentData: TournamentData | null;
  t: (path: string, params?: Record<string, string | number>) => string;
  onShowQR: () => void;
}

/**
 * RoomCodeSection - Displays room code, language, and share buttons
 */
export const RoomCodeSection = memo<RoomCodeSectionProps>(({
  gameCode,
  roomLanguage,
  tournamentData,
  t,
  onShowQR,
}) => {
  const handleCopyLink = useCallback(() => {
    copyJoinUrl(gameCode, t);
  }, [gameCode, t]);

  const handleShareWhatsApp = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

  const getLanguageDisplay = (lang: Language) => {
    switch (lang) {
      case 'he': return '🇮🇱 עברית';
      case 'sv': return '🇸🇪 Svenska';
      case 'ja': return '🇯🇵 日本語';
      default: return '🇺🇸 English';
    }
  };

  return (
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

        {/* Share Buttons - compact row with tooltips on mobile */}
        <div className="flex gap-1.5">
          <ShareButton
            variant="link"
            onClick={handleCopyLink}
            icon={<FaLink className="text-xs" />}
            className="px-2 py-1 text-xs h-7"
            tooltip={t('hostView.copyLink')}
          >
            <span className="hidden md:inline">{t('hostView.copyLink')}</span>
          </ShareButton>
          <ShareButton
            variant="whatsapp"
            onClick={handleShareWhatsApp}
            icon={<FaWhatsapp className="text-xs" />}
            className="px-2 py-1 text-xs h-7"
            tooltip={t('hostView.shareWhatsapp')}
          >
            <span className="hidden md:inline">{t('hostView.shareWhatsapp')}</span>
          </ShareButton>
          <ShareButton
            variant="qr"
            onClick={onShowQR}
            icon={<FaQrcode className="text-xs" />}
            className="px-2 py-1 text-xs h-7"
            tooltip={t('hostView.qrCode')}
          >
            <span className="hidden md:inline">{t('hostView.qrCode')}</span>
          </ShareButton>
        </div>
      </div>
    </Card>
  );
});

RoomCodeSection.displayName = 'RoomCodeSection';

export default RoomCodeSection;
