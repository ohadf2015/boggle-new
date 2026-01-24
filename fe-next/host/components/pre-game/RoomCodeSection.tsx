'use client';

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Share2, Trophy, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import UnifiedShareModal from '../../../components/modals/UnifiedShareModal';
import { useNativeShare } from '../../../hooks/useNativeShare';
import { useCrazyGamesInvite } from '../../../hooks/useCrazyGamesInvite';
import { getJoinUrl, copyJoinUrl } from '../../../utils/share';
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
 * RoomCodeSection - Displays room code, join link, QR code button, and share options
 *
 * Teacher UX focused: Link and QR code are immediately visible for easy sharing
 * - Join link is shown directly and can be copied with one click
 * - QR code button opens a large dialog perfect for projector display
 * - Share button provides additional sharing options (WhatsApp, etc.)
 */
export const RoomCodeSection = memo<RoomCodeSectionProps>(({
  gameCode,
  roomLanguage,
  roomName = '',
  tournamentData,
  t,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { canNativeShare, nativeShare } = useNativeShare();
  const { createInviteLink } = useCrazyGamesInvite();

  // Memoize the join URL to avoid recalculating on every render
  const joinUrl = useMemo(() => {
    const crazyGamesLink = createInviteLink(gameCode);
    return crazyGamesLink || getJoinUrl(gameCode, 'direct-link');
  }, [gameCode, createInviteLink]);

  const handleCopyLink = useCallback(async () => {
    const success = await copyJoinUrl(gameCode, t, 'copy-button');
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleShare = useCallback(async () => {
    if (canNativeShare) {
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
  }, [canNativeShare, nativeShare, joinUrl, t]);

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
      <Card className="bg-neo-navy/95 text-neo-white px-3 py-2 sm:px-4 sm:py-3 border-2 border-neo-black shadow-hard">
        <div className="flex flex-col gap-2">
          {/* Top Row: Room Code, Language, Tournament Badge */}
          <div className="flex items-center justify-between gap-2">
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
                  <Trophy className="mr-1 text-[10px]" />
                  R{tournamentData.currentRound}/{tournamentData.totalRounds}
                </Badge>
              )}
            </div>

            {/* Action Buttons: QR + Share */}
            <div className="flex items-center gap-2">
              {/* QR Code Button */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                aria-label={t('hostView.showQrCode') || 'Show QR Code'}
                title={t('hostView.showQrCode') || 'Show QR Code'}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-neo-cyan text-neo-black font-bold text-sm rounded-neo border-3 border-neo-black shadow-hard-md hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-sm active:translate-y-0 transition-all focus:outline-none focus:ring-2 focus:ring-neo-yellow focus:ring-offset-2"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">{t('hostView.qrCode') || 'QR'}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                aria-label={t('share.buttonLabel')}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-neo-yellow text-neo-black font-bold text-sm rounded-neo border-3 border-neo-black shadow-hard-md hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-sm active:translate-y-0 transition-all focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('share.buttonLabel')}</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Join Link with Copy Button */}
          <div className="flex items-center gap-2 bg-neo-black/30 rounded-neo px-2 py-1.5">
            <ExternalLink className="w-3 h-3 text-neo-cyan flex-shrink-0" />
            <span className="text-xs text-neo-cyan font-semibold truncate flex-1" title={joinUrl}>
              {joinUrl}
            </span>
            <button
              onClick={handleCopyLink}
              aria-label={linkCopied ? t('share.linkCopied') : t('share.copyLink')}
              title={linkCopied ? t('share.linkCopied') : t('share.copyLink')}
              className={`flex items-center gap-1 px-2 py-1 min-h-[32px] text-xs font-bold rounded-neo border-2 border-neo-black transition-all focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-1 ${
                linkCopied
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-pink text-neo-black hover:bg-neo-pink/80'
              }`}
            >
              {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{linkCopied ? t('share.copied') || 'Copied!' : t('share.copy') || 'Copy'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* QR Code Modal - Large display for projector */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent noDescription className="sm:max-w-md bg-neo-navy border-4 border-neo-black shadow-hard-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-neo-cyan flex items-center justify-center gap-2 text-xl font-black">
              <QrCode className="w-6 h-6" />
              {t('hostView.scanToJoin') || 'Scan to Join'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* QR Code - Large for projector display */}
            <div className="p-6 bg-white rounded-neo border-4 border-neo-black shadow-hard-lg">
              <QRCodeSVG
                value={joinUrl}
                size={250}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Room Code Display */}
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">{t('hostView.orEnterCode') || 'Or enter code:'}</p>
              <span className="text-4xl font-black text-neo-yellow tracking-wider">{gameCode}</span>
            </div>

            {/* Join URL */}
            <p className="text-xs text-center text-white/60 break-all px-4">
              {joinUrl}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full bg-neo-cyan text-neo-black font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
            >
              {t('hostView.close') || 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
