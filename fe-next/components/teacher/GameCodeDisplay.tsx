/**
 * GameCodeDisplay
 *
 * Enhanced game code display component with:
 * - Large, prominent game code
 * - Copy code/link functionality
 * - QR code toggle for easy mobile joining
 * - Projection mode trigger for classroom displays
 */

'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, QrCode, Monitor, Link2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface GameCodeDisplayProps {
  /** The game code to display */
  gameCode: string;
  /** The full URL for joining the game */
  joinUrl: string;
  /** Callback when projection mode is requested */
  onProjectionMode?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export default function GameCodeDisplay({
  gameCode,
  joinUrl,
  onProjectionMode,
  className,
}: GameCodeDisplayProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const [showQR, setShowQR] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Copy game code
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCodeCopied(true);
      toast.success(t('share.codeCopied'));
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  }, [gameCode, t]);

  // Copy join link
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      toast.success(t('teacher.game.linkCopied'));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [joinUrl, t]);

  // Toggle QR code
  const toggleQR = useCallback(() => {
    setShowQR((prev) => !prev);
  }, []);

  // Handle projection mode
  const handleProjection = useCallback(() => {
    onProjectionMode?.();
  }, [onProjectionMode]);

  return (
    <div
      className={cn(
        'rounded-neo border-neo border-neo-cyan bg-neo-cyan/20',
        'shadow-hard-lg p-6',
        isRTL && 'rtl',
        className
      )}
    >
      {/* Game Code Display */}
      <div className="text-center mb-4">
        <p className="text-sm text-neo-white font-neo-body mb-2">
          {t('education.classroomGame.shareCode')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <span data-selectable className="text-5xl font-black text-neo-cyan tracking-widest font-mono tabular-nums">
            {gameCode}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={t('share.copy')}
            className={cn(
              'p-3 rounded-neo border-neo border-neo-black',
              'bg-neo-cream text-neo-black',
              'shadow-hard hover:shadow-hard-lg',
              'transition-all',
              codeCopied && 'bg-neo-lime'
            )}
          >
            {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="flex flex-col items-center mb-4 p-4 bg-neo-cream rounded-neo">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            level="M"
            includeMargin={false}
          />
          <p className="text-sm text-neo-black/70 mt-2 font-neo-body">
            {t('teacher.game.scanToJoin')}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* QR Toggle */}
        <button
          type="button"
          onClick={toggleQR}
          aria-label={showQR ? t('teacher.game.hideQrCode') : t('teacher.game.qrCode')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-neo',
            'border-neo border-neo-black font-bold text-sm',
            'transition-all',
            showQR
              ? 'bg-neo-cyan text-neo-black shadow-hard'
              : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
          )}
        >
          <QrCode className="w-4 h-4" />
          {showQR ? t('teacher.game.hideQrCode') : t('teacher.game.qrCode')}
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={t('teacher.game.copyLink')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-neo',
            'border-neo border-neo-black font-bold text-sm',
            'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
            'shadow-hard-sm transition-all',
            linkCopied && 'bg-neo-lime text-neo-black'
          )}
        >
          {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {t('teacher.game.copyLink')}
        </button>

        {/* Projection Mode */}
        <button
          type="button"
          onClick={handleProjection}
          aria-label={t('teacher.game.projectMode')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-neo',
            'border-neo border-neo-black font-bold text-sm',
            'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
            'shadow-hard-sm transition-all'
          )}
        >
          <Monitor className="w-4 h-4" />
          {t('teacher.game.projectMode')}
        </button>
      </div>
    </div>
  );
}
