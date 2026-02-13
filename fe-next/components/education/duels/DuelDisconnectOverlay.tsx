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
import { motion } from 'framer-motion';
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
  onDismiss,
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
    <motion.div
      data-testid="disconnect-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-neo-navy border-neo-thick rounded-neo shadow-hard p-8 max-w-md text-center">
        {/* Icon */}
        <WifiOff className="w-16 h-16 text-neo-orange mx-auto mb-4" />

        {/* Heading */}
        <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-4">
          {t('duels.opponentDisconnected').replace('{opponentName}', opponentName)}
        </h2>

        {/* Countdown */}
        <div className="mb-6">
          <div className="text-6xl font-neo-display font-bold text-neo-yellow mb-2">
            {secondsRemaining}
          </div>
          <p className="text-neo-white/70 text-sm">
            {t('duels.autoForfeitMessage')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
