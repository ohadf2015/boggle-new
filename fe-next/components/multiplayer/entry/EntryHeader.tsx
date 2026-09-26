'use client';

import { useState } from 'react';
import { HelpCircle, Languages, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { useMasterMute } from '@/hooks/useMasterMute';
import { useMpExit } from '@/hooks/useMpExit';
import { LANGUAGE_OPTIONS, getLanguageFlag } from '@/lib/languageConfig';
import type { Language } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import { MpHudBar } from '../shell/MpHudBar';
import { MpBackButton } from '../shell/MpBackButton';
import { EntrySheet } from './EntrySheet';
import { LazyHowToPlay } from './entryLazy';

const ICON_BTN =
  'inline-flex items-center justify-center gap-1.5 h-10 min-w-10 tv:h-16 tv:min-w-16 px-2 shrink-0 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime';

/** The LexiClash wordmark; on desktop the mascot waves from the header (the old hero art, reduced to a 48px strip). */
function EntryLogo() {
  return (
    <div className="flex items-center gap-2 select-none" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/hello-nobg.webp"
        alt=""
        width={48}
        height={48}
        className="hidden lg:block h-12 w-12 tv:h-[72px] tv:w-[72px] object-contain -my-2 motion-safe:hover:animate-mp-bump"
      />
      <span className="font-neo-display text-xl lg:text-2xl tv:text-4xl font-bold uppercase tracking-tight leading-none">
        <span className="text-neo-lime">Lexi</span>
        <span className="text-neo-cyan">Clash</span>
      </span>
    </div>
  );
}

/**
 * The entry's own header (DESIGN §b.1), replacing the global site header:
 * [home → mpExit('back-from-entry')] [logo] [language chip] [sound] [?].
 * It hosts the mute control, so the global in-game audio FAB stands down.
 */
export function EntryHeader() {
  const { t, language, setLanguage } = useLanguage();
  const exit = useMpExit();
  const mute = useMasterMute();
  const [sheet, setSheet] = useState<'language' | 'help' | null>(null);
  useRegisterHeaderAudioControl();

  const current = (language || 'en') as Language;
  const close = () => setSheet(null);

  return (
    <>
      <h1 className="sr-only">{t('multiplayerFlow.roomList.arenaHub')}</h1>
      <MpHudBar
        className="border-b-2 border-neo-black/70 lg:px-6"
        start={
          <>
            <MpBackButton kind="home" onPress={() => exit('back-from-entry')} />
            <EntryLogo />
          </>
        }
        center={null}
        end={
          <>
            <button
              type="button"
              data-testid="entry-language-chip"
              onClick={() => setSheet('language')}
              aria-label={t('mpUi.entry.language', { language: current.toUpperCase() })}
              className={ICON_BTN}
            >
              <span className="text-lg leading-none">{getLanguageFlag(current)}</span>
              <span className="hidden sm:inline font-neo-display text-xs font-bold uppercase">{current}</span>
            </button>
            <button type="button" onClick={mute.toggle} aria-label={mute.label} title={mute.title} className={ICON_BTN}>
              {mute.allMuted ? <VolumeX aria-hidden="true" className="h-5 w-5" /> : <Volume2 aria-hidden="true" className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => setSheet('help')} aria-label={t('mpUi.entry.howToPlay')} className={ICON_BTN}>
              <HelpCircle aria-hidden="true" className="h-5 w-5" />
            </button>
          </>
        }
      />

      <EntrySheet open={sheet === 'language'} onClose={close} title={t('mpUi.entry.chooseLanguage')} icon={Languages} tone="yellow" testId="entry-language-sheet">
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = opt.code === current;
            return (
              <button
                key={opt.code}
                type="button"
                lang={opt.code}
                aria-pressed={active}
                onClick={() => {
                  close();
                  if (!active) setLanguage?.(opt.code);
                }}
                className={cn(
                  'flex min-h-12 tv:min-h-16 items-center gap-3 rounded-neo border-2 border-neo-black px-3 py-2 text-start font-neo-display tv:text-2xl font-bold shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-hard-pressed',
                  active ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy text-neo-white hover:-translate-y-0.5',
                )}
              >
                <span className="text-2xl tv:text-4xl leading-none" aria-hidden="true">{opt.flag}</span>
                <span>{opt.nativeName}</span>
              </button>
            );
          })}
        </div>
      </EntrySheet>

      <EntrySheet open={sheet === 'help'} onClose={close} title={t('mpUi.entry.howToPlay')} icon={HelpCircle} tone="purple" testId="entry-help-sheet">
        {sheet === 'help' && <LazyHowToPlay onClose={close} />}
      </EntrySheet>
    </>
  );
}
