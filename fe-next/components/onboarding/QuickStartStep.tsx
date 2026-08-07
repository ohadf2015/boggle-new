'use client';

import React, { useCallback, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Play, Shuffle, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_GAME_LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import { suggestPlayerName } from '@/utils/onboardingNameSuggestions';
import { useImeText } from '@/hooks/useImeText';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import MiniGrid from './MiniGrid';
import { demoConfigs } from './demoConfigs';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

export interface QuickStartStepProps {
  /** Start the game. Called with whatever identity the player happens to have. */
  onPlay: (name: string, avatar: CustomAvatarConfig, nameEdited: boolean) => void;
  /** Opt-in tutorial. */
  onHowToPlay: () => void;
  /** Sign-in shortcut. Omitted on platforms without external auth (CrazyGames). */
  onHaveAccount?: () => void;
}

/**
 * QuickStartStep — the entire FTUE, on one screen.
 *
 * Replaces the old language → profile → style sequence. Those were three
 * full-screen gates in front of a word game, and the first one needed two taps
 * on the same flag (select, then confirm) to advance, which is where new
 * players got stuck.
 *
 * The rules here:
 * - PLAY is the biggest thing on screen and is NEVER disabled. Name and avatar
 *   arrive pre-filled, so identity is something a player may change, not
 *   something they must supply.
 * - Language is one tap, applied in place. It does not advance anything.
 * - The tutorial is a link, not a step.
 * - The GAME leads. A self-tracing demo board sits above everything else so a
 *   player sees what LexiClash actually is within a second of arriving. The
 *   screen previously opened with a wordmark and a form: an avatar, a name
 *   field, six flags, PLAY, two links and an account-signup block — roughly
 *   eight interactive targets and not one tile of gameplay. 24 of 61 starters
 *   (39%) abandoned here.
 * - Nothing is asked for before the game has given something. The signup block
 *   that used to sit at the bottom of this card asked for an account before the
 *   player had seen a single word; guests already get a signup CTA on the
 *   result screen, where there is finally something to sign up FOR.
 * See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */
const QuickStartStep: React.FC<QuickStartStepProps> = ({ onPlay, onHowToPlay, onHaveAccount }) => {
  const { t, dir, language, setLanguage } = useLanguage();

  // Snapshot the suggestion so we can tell later whether the player edited it.
  const suggestionRef = useRef<string>('');
  if (suggestionRef.current === '') {
    suggestionRef.current = suggestPlayerName(language);
  }

  // IME-resilient input: mobile keyboards commit text without firing React's
  // synthetic onChange, and a naive controlled input then snaps back to the
  // stale suggestion — i.e. "I can't change my name". See useImeText.
  const { value: name, getValue: getLiveName, setValue: setName, inputProps } = useImeText<HTMLInputElement>({
    maxLength: 20,
    initialValue: suggestionRef.current,
  });

  const [avatar, setAvatar] = useState<CustomAvatarConfig>(getRandomAvatarConfig);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(language as Language);

  const handleShuffle = useCallback(() => {
    setAvatar(getRandomAvatarConfig());
    const next = suggestPlayerName(language);
    suggestionRef.current = next;
    setName(next);
  }, [language, setName]);

  // One tap applies the language in place. `skipNavigation` keeps the router
  // from remounting the page and bouncing the player back to the start.
  const handleLanguage = useCallback(
    (lang: Language) => {
      setSelectedLang(lang);
      if (lang !== language) setLanguage(lang, { skipNavigation: true });
    },
    [language, setLanguage]
  );

  // Localized demo word/path — shared with WelcomeDemoStep and PreGameTutorial.
  const demo = demoConfigs[selectedLang] ?? demoConfigs.en;

  const handlePlay = useCallback(() => {
    // Read the DOM directly — React state can lag mid-composition on mobile.
    const live = getLiveName();
    // An empty field is not an error. Fall back to the suggestion and go.
    const finalName = live.length > 0 ? live : suggestionRef.current;
    onPlay(finalName, avatar, finalName !== suggestionRef.current.trim());
  }, [getLiveName, avatar, onPlay]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 lg:max-w-md" dir={dir}>
      {/* Brand hero */}
      <m.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="font-neo-display text-4xl font-black tracking-tight text-neo-lime lg:text-5xl"
        style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.3)' }}
      >
        LexiClash
      </m.h1>

      {/* The game, first. Self-tracing so it demonstrates the one mechanic
          (drag to link letters) without asking the player to do anything. */}
      <MiniGrid
        key={selectedLang}
        size={3}
        letters={demo.letters}
        demoWord={demo.word}
        demoPath={demo.path}
        autoTrace
        showHints={false}
        onDemoComplete={() => {}}
        className="pointer-events-none"
      />

      {/* Language — one tap, applied in place. Deliberately small and above the
          card: it is a correction affordance, not a question the player must
          answer before continuing. */}
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label={t('onboarding.ftue.chooseLanguage')}>
        {SUPPORTED_GAME_LANGUAGES.map((lang) => {
          const config = LANGUAGE_CONFIG[lang];
          const isSelected = selectedLang === lang;
          return (
            <button
              key={lang}
              type="button"
              data-testid={`quick-start-lang-${lang}`}
              onClick={() => handleLanguage(lang)}
              aria-pressed={isSelected}
              aria-label={config.name}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-neo border-2 text-xl transition-all',
                isSelected
                  ? 'border-neo-lime bg-neo-lime/20 shadow-hard-sm'
                  : 'border-neo-cream/20 bg-neo-navy-light hover:border-neo-cream/40'
              )}
            >
              <span role="img" aria-hidden>
                {config.flag}
              </span>
            </button>
          );
        })}
      </div>

      <NeoPanel tone="cream" shadow="md" className="w-full p-5 sm:p-6">
        {/* Identity row — avatar beside name, one line, both pre-filled. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="quick-start-avatar"
            onClick={() => setIsBuilderOpen(true)}
            aria-label={t('onboarding.ftue.editAvatar', 'Customize avatar')}
            className="relative shrink-0"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full border-3 border-neo-black bg-neo-white shadow-hard-sm">
              <Avatar customAvatar={avatar} size="lg" />
            </div>
            <span className="absolute -bottom-1 -inset-e-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime shadow-hard-sm">
              <Pencil className="h-3 w-3 text-neo-black" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <label htmlFor="quick-start-name" className="sr-only">
              {t('onboarding.name.label')}
            </label>
            <input
              {...inputProps}
              id="quick-start-name"
              data-testid="quick-start-name"
              type="text"
              maxLength={20}
              autoComplete="off"
              placeholder={t('onboarding.name.placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePlay();
              }}
              className={cn(
                'min-h-[48px] w-full rounded-neo border-3 border-neo-black bg-white px-3 py-2.5',
                'font-bold text-lg text-neo-black placeholder:text-neo-black/50',
                'shadow-hard-sm focus:outline-hidden focus:ring-3 focus:ring-neo-cyan'
              )}
            />
          </div>

          <button
            type="button"
            data-testid="quick-start-shuffle"
            onClick={handleShuffle}
            aria-label={t('onboarding.ftue.randomize', 'Randomize')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-white shadow-hard-sm transition-colors hover:bg-neo-yellow"
          >
            <Shuffle className="h-5 w-5 text-neo-black" />
          </button>
        </div>

        <AvatarBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={(config: CustomAvatarConfig) => {
            setAvatar(config);
            setIsBuilderOpen(false);
          }}
          initialConfig={avatar}
          premium={null}
        />

        {/* The one thing the screen is for. Never disabled — an empty name falls
            back to the suggestion rather than blocking the tap. */}
        <m.button
          type="button"
          data-testid="quick-start-play"
          onClick={handlePlay}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 2 }}
          className={cn(
            'mt-5 flex w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black',
            'bg-neo-lime py-4 font-neo-display text-2xl font-black uppercase tracking-wide text-neo-navy',
            'shadow-hard active:translate-y-[2px] active:shadow-hard-pressed'
          )}
        >
          <Play className="h-6 w-6" fill="currentColor" />
          {t('onboarding.quickStart.play')}
        </m.button>

        {/* Secondary choices. The tutorial lives here — offered, never imposed. */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold">
          <button
            type="button"
            data-testid="quick-start-how-to-play"
            onClick={onHowToPlay}
            className="min-h-[44px] px-2 text-neo-black/70 underline underline-offset-2 transition-colors hover:text-neo-black"
          >
            {t('onboarding.quickStart.howToPlay')}
          </button>
          {onHaveAccount && (
            <button
              type="button"
              data-testid="quick-start-have-account"
              onClick={onHaveAccount}
              className="min-h-[44px] px-2 text-neo-black/70 underline underline-offset-2 transition-colors hover:text-neo-black"
            >
              {t('onboarding.quickStart.haveAccount')}
            </button>
          )}
        </div>
      </NeoPanel>
    </div>
  );
};

export default QuickStartStep;
