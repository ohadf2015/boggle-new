'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import TvInstallQr from './TvInstallQr';
import { DJMascotWithEntrance } from '../../../components/ui/DJMascot';
import type { Language } from '@/shared/types';

interface TvResultsTopBarProps {
  title: string;
  subtitle?: string;
  showTitle: boolean;
  language: Language;
  fullscreen: { supported: boolean; active: boolean; toggle: () => void };
  t: (path: string, params?: Record<string, string | number>) => string;
}

// Physical, not logical: the app's sound toggle is pinned top-right in both LTR and RTL.
const CLEAR_SOUND_BUTTON = 'pr-20';

const TITLE_SHADOW = { textShadow: '4px 4px 0 rgb(var(--neo-black))' };

const TvResultsTopBar = memo<TvResultsTopBarProps>(({ title, subtitle, showTitle, language, fullscreen, t }) => (
  <header
    data-testid="tv-results-topbar"
    className={`relative z-[65] grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 pt-2 pb-1 pl-6 ${CLEAR_SOUND_BUTTON}`}
  >
    <div className="flex min-w-0 items-center gap-3">
      <TvInstallQr language={language} t={t} />
      <div className="hidden shrink-0 xl:block">
        <DJMascotWithEntrance size="xs" delay={0.5} />
      </div>
    </div>

    <div className="text-center">
      {showTitle && (
        <m.h1
          initial={{ y: -40, scale: 0.8 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="font-neo-display text-[clamp(2.25rem,6vh,4.75rem)] font-black uppercase leading-none tracking-wide text-neo-yellow"
          style={TITLE_SHADOW}
        >
          {title}
        </m.h1>
      )}
      {showTitle && subtitle && (
        <p className="mt-1 font-neo-display text-lg font-black uppercase text-neo-cream/80">{subtitle}</p>
      )}
    </div>

    <div className="flex justify-end">
      {fullscreen.supported && (
        <m.button
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={fullscreen.toggle}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-elevated p-3 text-neo-cream shadow-hard-sm"
          title={fullscreen.active ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
          aria-label={fullscreen.active ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
        >
          {fullscreen.active ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
        </m.button>
      )}
    </div>
  </header>
));

TvResultsTopBar.displayName = 'TvResultsTopBar';

export default TvResultsTopBar;
