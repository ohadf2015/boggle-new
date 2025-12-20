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
    <Card className="bg-slate-800/95 text-neo-white p-3 sm:p-4 md:p-6 border-4 border-neo-black shadow-hard-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Room Code and Language */}
        <div className="flex flex-col items-center sm:items-start gap-2">
          <div className="flex items-center gap-3">
            <div className="text-center sm:text-left">
              <p className="text-sm text-neo-cyan font-bold uppercase">{t('hostView.roomCode')}:</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-neo-yellow">
                {gameCode}
              </h2>
            </div>
            <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
              {getLanguageDisplay(roomLanguage)}
            </Badge>
            {tournamentData && (
              <Badge className="text-sm px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                <FaTrophy className="mr-1" />
                {t('hostView.tournamentMode')} - {t('hostView.tournamentRound')} {tournamentData.currentRound}/{tournamentData.totalRounds}
              </Badge>
            )}
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          <ShareButton
            variant="link"
            onClick={handleCopyLink}
            icon={<FaLink />}
          >
            {t('hostView.copyLink')}
          </ShareButton>
          <ShareButton
            variant="whatsapp"
            onClick={handleShareWhatsApp}
            icon={<FaWhatsapp />}
          >
            {t('hostView.shareWhatsapp')}
          </ShareButton>
          <ShareButton
            variant="qr"
            onClick={onShowQR}
            icon={<FaQrcode />}
          >
            {t('hostView.qrCode')}
          </ShareButton>
        </div>
      </div>
    </Card>
  );
});

RoomCodeSection.displayName = 'RoomCodeSection';

export default RoomCodeSection;
