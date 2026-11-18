'use client';

import { Bell, WifiOff, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { InstallSource } from '@/lib/androidInstall/installTracking';
import GooglePlayMark from './GooglePlayMark';
import InstallPromoStage from './InstallPromoStage';
import InstallQrTicket from './InstallQrTicket';
import styles from './InstallPromoCard.module.css';

interface Props {
  wide: boolean;
  source: InstallSource;
  onInstall: () => void;
  onDismiss: () => void;
}

export default function InstallPromoCard({ wide, source, onInstall, onDismiss }: Props) {
  const { t, language } = useLanguage();
  const perks = [
    { Icon: Zap, text: t('androidAppPromo.perkFaster'), color: 'bg-neo-lime' },
    { Icon: WifiOff, text: t('androidAppPromo.perkOffline'), color: 'bg-neo-cyan' },
    { Icon: Bell, text: t('androidAppPromo.perkReminders'), color: 'bg-neo-orange' },
  ];

  return (
    <div className={cn(wide && 'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]')}>
      <InstallPromoStage locale={language} wide={wide} />

      <div className={cn('flex flex-col gap-4 p-5 pb-2', wide && 'justify-center gap-3.5 p-6 pb-3')}>
        <div dir="auto">
          <DialogTitle className={cn('text-neo-lime text-balance', wide && 'pe-8 text-3xl')}>
            {t('androidAppPromo.title')}
          </DialogTitle>
          <p className="mt-1.5 text-sm font-medium text-neo-white sm:text-base [@media(max-height:720px)]:hidden">{t('androidAppPromo.subtitle')}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {perks.map(({ Icon, text, color }) => (
            <li key={text} dir="auto" className="flex items-center gap-2.5">
              <span className={cn('flex h-7 w-7 shrink-0 -rotate-3 items-center justify-center rounded-neo border-3 border-neo-black text-neo-black shadow-hard-sm', color)}>
                <Icon className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-neo-white">{text}</span>
            </li>
          ))}
        </ul>

        {wide && <InstallQrTicket source={source} />}

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onInstall}
            aria-label={`${t('androidAppPromo.install')} — Google Play`}
            className={cn(
              'inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-neo border-3 border-neo-black px-3 py-2.5 text-neo-black shadow-hard transition-[transform,box-shadow] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan',
              wide ? 'bg-neo-white' : cn('bg-neo-lime', styles.cta),
            )}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-neo bg-neo-black">
              <GooglePlayMark size={20} />
            </span>
            <span className="flex min-w-0 flex-col items-start leading-none">
              <span className="text-[11px] font-bold uppercase tracking-wider">{t('androidAppPromo.installEyebrow')}</span>
              <span className="mt-0.5 font-neo-display text-[17px] font-black tracking-tight whitespace-nowrap">{t('androidAppPromo.install')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 w-full px-4 text-sm font-bold uppercase tracking-wide text-neo-white/75 transition-colors hover:text-neo-white"
          >
            {t('androidAppPromo.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
