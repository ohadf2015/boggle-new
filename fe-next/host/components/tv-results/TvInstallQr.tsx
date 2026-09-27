'use client';

/**
 * TvInstallQr — "take it home" install prompt for the big-screen results view.
 *
 * The post-game moment is when spectators/players most want the app on their
 * own phone, so we surface a scan-to-install QR pointing at the Play Store
 * (carrying a `tv_results_qr` install referrer for Play Console attribution).
 *
 * Scan-only: no click handler — the conversion happens on the scanning phone,
 * measured via the referrer + a one-shot impression event. Distinct from the
 * join QR (TvJoinBar), which onboards players INTO the current game.
 */

import { memo, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { m } from 'framer-motion';
import type { Language } from '@/shared/types';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';
import { trackTvInstallQrShown } from '@/lib/androidInstall/installTracking';

interface TvInstallQrProps {
  language: Language;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const TvInstallQr = memo<TvInstallQrProps>(({ language, t }) => {
  const installUrl = useMemo(
    () => playStoreUrlWithReferrer('tv_results_qr', language),
    [language]
  );

  useEffect(() => {
    trackTvInstallQrShown();
  }, []);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.4 }}
      className="absolute top-4 start-4 z-[70] flex items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-2 shadow-hard"
    >
      <div className="text-start max-w-[8rem]">
        <p className="font-neo-display text-sm font-black uppercase leading-tight tracking-tight text-neo-black">
          {t('tvResults.installHeading')}
        </p>
        <p className="mt-0.5 text-xs font-bold leading-tight text-neo-black/80">
          {t('tvResults.installCta')}
        </p>
      </div>
      <div className="rounded-md border-2 border-neo-black bg-white p-1.5">
        <QRCodeSVG value={installUrl} size={72} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
    </m.div>
  );
});

TvInstallQr.displayName = 'TvInstallQr';

export default TvInstallQr;
