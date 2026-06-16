'use client';

import { useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { isNative } from '@/utils/platform';
import { savePendingOnboardingProfile } from '@/utils/onboardingStorage';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { useOAuthSignIn } from '@/components/auth/hooks/useOAuthSignIn';
import { GoogleIcon } from '@/components/auth/shared/icons/BrandIcons';
import { cn } from '@/lib/utils';

interface OnboardingGoogleSignupProps {
  /** Current (untrimmed) name in the profile input. */
  name: string;
  /** Current crafted avatar. */
  avatar: CustomAvatarConfig;
  /** Whether the name currently passes validation. */
  nameValid: boolean;
  /** Whether the user changed the name from the auto-suggestion. */
  nameEdited: boolean;
  className?: string;
}

/**
 * Optional, delightful "Sign up with Google" panel for the FTUE profile step.
 *
 * The primary path stays guest ("Let's Go"); this is a secondary upsell that
 * lets a brand-new player lock in the avatar + name they just crafted.
 *
 * Persistence is EAGER (effect-driven), not click-driven: the web GSI button is
 * a cross-origin iframe whose click we can't intercept, so we keep the pending
 * FTUE identity written to storage whenever the name is valid. createNewProfile
 * then reads it on first sign-in. We write ONLY the pending blob (never the
 * onboarding-complete flag) so abandoning here doesn't skip the FTUE next time.
 */
export default function OnboardingGoogleSignup({
  name,
  avatar,
  nameValid,
  nameEdited,
  className,
}: OnboardingGoogleSignupProps) {
  const { t, dir } = useLanguage();

  const persistPending = useCallback(() => {
    if (!nameValid) return;
    savePendingOnboardingProfile({ displayName: name.trim(), avatarId: 'custom', nameEdited });
    setStoredCustomAvatar(avatar);
  }, [name, avatar, nameValid, nameEdited]);

  // Keep the crafted identity on disk so whichever Google path fires carries it.
  useEffect(() => {
    persistPending();
  }, [persistPending]);

  const { signIn, loadingProvider } = useOAuthSignIn({ onBeforeRedirect: persistPending });

  // On web with a Google web client configured, use Google's in-page token
  // button (consent shows OUR domain). Native / unconfigured web falls back to
  // the redirect SDK path.
  const useGsiButton = !isNative() && !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  return (
    <m.div
      data-testid="onboarding-google-signup"
      dir={dir}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, type: 'spring', stiffness: 380, damping: 26 }}
      className={cn('mt-4', className)}
    >
      {/* "or" divider */}
      <div className="flex items-center gap-3 mb-3" aria-hidden>
        <span className="h-0.5 flex-1 bg-neo-black/15 rounded-full" />
        <span className="text-[10px] font-black uppercase tracking-wider text-neo-black/45">
          {t('common.or', 'or')}
        </span>
        <span className="h-0.5 flex-1 bg-neo-black/15 rounded-full" />
      </div>

      {/* Save-forever panel — lime accent = positive/permanent */}
      <div className="rounded-neo border-3 border-neo-black bg-neo-lime/15 p-3 shadow-hard-sm">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <m.span
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 500, damping: 14 }}
          >
            <Sparkles className="w-4 h-4 text-neo-black" strokeWidth={2.5} />
          </m.span>
          <h3 className="text-sm font-black text-neo-black text-center">
            {t('onboarding.ftue.google.headline')}
          </h3>
        </div>
        <p className="text-[11px] font-bold text-neo-black/70 text-center leading-snug mb-3">
          {t('onboarding.ftue.google.subtext')}
        </p>

        {useGsiButton ? (
          <GoogleSignInButton />
        ) : (
          <button
            type="button"
            data-testid="onboarding-google-fallback"
            onClick={() => signIn('google')}
            disabled={loadingProvider === 'google'}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-neo',
              'border-3 border-neo-black bg-white text-neo-black font-black',
              'shadow-hard-sm transition-all hover:shadow-hard active:translate-y-0.5',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            <GoogleIcon className="w-5 h-5" />
            <span>{t('onboarding.ftue.google.cta')}</span>
          </button>
        )}

        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-neo-black/45">
          <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
          {t('onboarding.ftue.google.reassure')}
        </p>
      </div>
    </m.div>
  );
}
