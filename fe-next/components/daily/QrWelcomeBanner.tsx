'use client';

import React from 'react';
import { m } from 'framer-motion';
import { ScanLine } from 'lucide-react';

export interface QrWelcomeBannerProps {
  /** True when the visitor landed via a printed QR / barcode scan (`?from=qr`). */
  show: boolean;
  t: (key: string) => string;
}

/**
 * Witty welcome for players who scanned a physical QR / barcode and got warped
 * straight to the daily challenge. Mirrors ScoreGauntletBanner's neo-brutalist
 * banner so it sits naturally at the top of the daily landing.
 */
export const QrWelcomeBanner: React.FC<QrWelcomeBannerProps> = ({ show, t }) => {
  if (!show) return null;

  return (
    <m.div
      data-testid="qr-welcome-banner"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-linear-to-r from-neo-cyan/20 to-neo-lime/20 border-3 border-neo-cyan rounded-neo shadow-hard p-3 mb-1"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>📱</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-neo-cyan font-black uppercase tracking-widest flex items-center gap-1">
            <ScanLine className="w-3 h-3" aria-hidden />
            {t('daily.qrWelcome.badge')}
          </div>
          <div className="text-neo-white font-bold text-sm">
            {t('daily.qrWelcome.line')}
          </div>
        </div>
      </div>
    </m.div>
  );
};

export default QrWelcomeBanner;
