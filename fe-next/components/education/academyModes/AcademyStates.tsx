'use client';

/** Loading + notice panels for the academy mode routes (never redirect — always a way back to /{locale}/student). */

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AcademyModeFrame, ACADEMY_ART, primaryButtonClass, secondaryButtonClass } from './AcademyChrome';
import type { SceneTheme } from './AcademyScene';
import { ReviewVaultIntro } from './ReviewVaultIntro';
import { WorkshopVsIntro } from './WorkshopVsIntro';
import { useAcademyPlayer } from './useAcademyPlayer';

export function AcademyLoading({ title, onBack, theme }: { title: string; onBack: () => void; theme?: SceneTheme }) {
  const player = useAcademyPlayer();
  // The loader IS the mode's intro scene (vault / VS arena) with a disabled button, so the first frame is never a blank spinner.
  const vault = theme === 'vault';
  const noop = () => {};
  return (
    <AcademyModeFrame title={title} onBack={onBack} theme={theme} accent={vault ? 'cyan' : 'yellow'}>
      <div role="status" data-testid="academy-loading" className="flex h-full min-h-0 w-full flex-col items-center">
        {vault ? (
          <ReviewVaultIntro lessonName="" words={[]} onStart={noop} loading />
        ) : (
          <WorkshopVsIntro lessonName="" chips={[]} player={player} starting={false} startFailed={false} onPlay={noop} loading />
        )}
      </div>
    </AcademyModeFrame>
  );
}

export function AcademyNotice({
  title,
  heading,
  body,
  art,
  onBack,
  onRetry,
  testId,
  theme,
}: {
  title: string;
  heading: string;
  body: string;
  art: string;
  onBack: () => void;
  onRetry?: () => void;
  testId?: string;
  theme?: SceneTheme;
}) {
  const { t } = useLanguage();
  return (
    <AcademyModeFrame title={title} onBack={onBack} theme={theme}>
      <div data-testid={testId} className="flex w-full max-w-md flex-col items-center text-center lg:max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
        <img src={art} alt="" className="mb-3 h-44 w-44 object-contain drop-shadow-[6px_6px_0_#000] lg:h-80 lg:w-80" />
        <h2 className="mb-2 font-neo-display text-3xl font-black uppercase text-neo-white lg:text-6xl" style={{ textShadow: '3px 3px 0 #000' }}>{heading}</h2>
        <p className="mb-5 font-neo-body text-base text-neo-cream lg:text-2xl">{body}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={cn(primaryButtonClass, 'mb-2 w-full lg:max-w-xl')}>
            {t('academy.modes.tryAgain', 'Try again')}
          </button>
        )}
        <button type="button" onClick={onBack} className={cn(onRetry ? secondaryButtonClass : primaryButtonClass, 'w-full lg:max-w-xl')}>
          {t('academy.modes.backToAcademy', 'Back to Academy')}
        </button>
      </div>
    </AcademyModeFrame>
  );
}
