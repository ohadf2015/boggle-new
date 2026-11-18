'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';
import { trackInstallQrShown, type InstallSource } from '@/lib/androidInstall/installTracking';
import styles from './InstallPromoCard.module.css';

export default function InstallQrTicket({ source }: { source: InstallSource }) {
  const { t, language } = useLanguage();
  const url = playStoreUrlWithReferrer('install_qr', language);

  useEffect(() => {
    trackInstallQrShown(source);
  }, [source]);

  return (
    <div className="flex items-center gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cyan p-3 text-neo-black shadow-hard-sm">
      <div className={styles.qrFrame}>
        <div role="img" aria-label={t('androidAppPromo.qrAlt')} data-qr-value={url} className="rounded-neo bg-neo-white p-1.5">
          <QRCodeSVG value={url} size={124} level="M" bgColor="rgb(255 255 255)" fgColor="rgb(0 0 0)" />
        </div>
      </div>
      <div className="min-w-0" dir="auto">
        <p className="font-neo-display text-xl font-black leading-tight text-balance">{t('androidAppPromo.qrTitle')}</p>
        <p className="mt-1 text-sm font-medium leading-snug">{t('androidAppPromo.qrHint')}</p>
      </div>
    </div>
  );
}
