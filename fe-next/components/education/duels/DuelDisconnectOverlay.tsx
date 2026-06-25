'use client';

/**
 * DuelDisconnectOverlay - Opponent disconnected overlay with countdown
 *
 * Features:
 * - Full overlay with semi-transparent dark background
 * - WifiOff icon and disconnect message
 * - Countdown timer showing seconds remaining
 * - Auto-forfeit message
 * - Framer Motion fade-in animation
 * - Neo-brutalist styling
 */

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface DuelDisconnectOverlayProps {
  opponentName: string;
  gracePeriodSeconds?: number;
  onDismiss?: () => void;
}

export function DuelDisconnectOverlay({
  opponentName,
  gracePeriodSeconds = 30,
  onDismiss: _onDismiss,
}: DuelDisconnectOverlayProps) {
  const { t } = useLanguage();
  const [secondsRemaining, setSecondsRemaining] = useState(gracePeriodSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-testid="disconnect-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-xs animate-in fade-in-0 duration-300"
    >
      <div className="bg-neo-navy border-neo-thick rounded-neo shadow-hard p-8 max-w-md text-center">
        {/* Icon */}
        <WifiOff className="w-16 h-16 text-neo-pink mx-auto mb-4" />

        {/* Heading */}
        <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-4">
          {t('duels.opponentDisconnected', { opponentName })}
        </h2>

        {/* Countdown */}
        <div className="mb-6">
          <div className="text-6xl font-neo-display font-bold text-neo-lime mb-2">
            {secondsRemaining}
          </div>
          <p className="text-neo-white text-sm">
            {t('duels.autoForfeitMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}
