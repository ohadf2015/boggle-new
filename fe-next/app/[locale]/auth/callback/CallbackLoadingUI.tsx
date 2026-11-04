'use client';

import { PageLoader } from '@/components/ui/PageLoader';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoadingUIProps {
  secondsRemaining: number;
  showRetry: boolean;
  onRetry: () => void;
  locale: string;
}

/** Countdown, then a retry button when the exchange hangs. */
export function LoadingUI({ secondsRemaining, showRetry, onRetry, locale }: LoadingUIProps): React.JSX.Element {
  const { t } = useLanguage();
  const isRtl = locale === 'he';

  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col items-center gap-6">
        <PageLoader size="lg" text={t('auth.callback.completingSignIn')} />

        {!showRetry && secondsRemaining > 0 && (
          <p className="text-neo-white text-sm">
            {secondsRemaining}...
          </p>
        )}

        {showRetry && (
          <div className="flex flex-col items-center gap-3 animate-neo-pop">
            <p className="text-neo-white text-sm text-center max-w-xs">
              {t('auth.callback.takingTooLong')}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="px-6 py-3 bg-neo-pink text-neo-white font-neo-display font-bold
                         rounded-neo border-neo-thick border-black shadow-hard
                         hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]
                         active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                         transition-[box-shadow,translate,scale,rotate,transform] duration-150"
            >
              {t('auth.callback.tryAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
