'use client';

/**
 * ResultsSignupModal — Minimal signup form for daily results modal
 *
 * Simplified signup interface for the daily results screen modal:
 * - One line of motivational copy
 * - Email input field
 * - One OAuth button (Google)
 *
 * Handles:
 * - Save pending daily result before OAuth redirect
 * - CrazyGames platform check (no signup on that platform)
 * - Email + magic link flow
 */

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { X, Mail, Sparkles } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { signInWithMagicLink, sendOtpCode, verifyOtpCode } from '@/lib/supabase';
import { useOAuthSignIn } from '@/components/auth/hooks/useOAuthSignIn';
import { isNative } from '@/utils/platform';
import { cn } from '@/lib/utils';
import { setPendingDailyResult, type WordHuntResult } from '@/utils/dailyChallenge';
import { validateEmail } from '@/utils/validation';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { Language } from '@/types';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface ResultsSignupModalProps {
  /** Pending Word Hunt result to save before OAuth redirect */
  pendingResult: {
    result: WordHuntResult;
    puzzleNumber: number;
    puzzleDate: string;
    language: Language;
  };
  /** Called when user closes the modal */
  onDismiss: () => void;
  /** Applied to the modal container (fixed positioning, etc) */
  className?: string;
}

export const ResultsSignupModal: React.FC<ResultsSignupModalProps> = ({
  pendingResult,
  onDismiss,
  className,
}) => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // Save pending result before any auth redirect
  const savePending = () => setPendingDailyResult(pendingResult);

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpFlow] = useState(isNative);

  const { signIn: oauthSignIn } = useOAuthSignIn({
    onBeforeRedirect: savePending,
    onError: (msg) => setError(msg),
  });

  // Hide entirely on CrazyGames
  if (isOnCrazyGamesPlatform) return null;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) {
      const result = validateEmail(value);
      setEmailError(result.isValid ? null : (result.error ? t(result.error) : null));
    } else {
      setEmailError(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    savePending();
    await oauthSignIn('google');
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error ? t(emailValidation.error) : 'Invalid email');
      return;
    }

    setIsLoading('magiclink');
    setError(null);
    setEmailError(null);

    try {
      savePending();

      if (showOtpFlow) {
        const result = await sendOtpCode(email);
        if (result.error) {
          setError(result.error.message);
        } else {
          setOtpSent(true);
        }
      } else {
        const result = await signInWithMagicLink(email);
        if (result.error) {
          setError(result.error.message);
        }
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;

    setIsLoading('otp');
    setError(null);

    try {
      savePending();
      const result = await verifyOtpCode(email, otpCode);
      if (result.error) {
        setError(result.error.message);
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  return (
    <m.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative rounded-neo border-2 border-neo-cyan/50 bg-neo-navy/95 shadow-hard-lg p-6 max-w-sm w-full">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          aria-label={t('common.dismiss')}
        >
          <X className="w-4 h-4 text-neo-white hover:text-white" />
        </button>

        {/* Icon decoration */}
        <div className="flex justify-center mb-4">
          <Sparkles className="w-6 h-6 text-neo-cyan" />
        </div>

        {/* One line of copy */}
        <h3 className="text-center text-lg font-bold text-white mb-6">
          {t('daily.results.signup.shortPrompt')}
        </h3>

        {/* Error Message */}
        {error && (
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-500/20 border-2 border-red-500 rounded-neo p-3 mb-4 text-center"
            role="alert"
          >
            <p className="text-sm font-bold text-red-300">{error}</p>
          </m.div>
        )}

        {/* Google OAuth Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading !== null}
          variant="secondary"
          className="w-full mb-3"
        >
          {isLoading === 'google' ? (
            <Loader size="sm" />
          ) : (
            <>
              <GoogleIcon className="w-5 h-5" />
              <span className="ms-2">{t('auth.google.signUp')}</span>
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-2 text-xs text-neo-white/60 my-4">
          <div className="flex-1 h-px bg-neo-white/20" />
          <span>{t('auth.magicLink.divider', 'or')}</span>
          <div className="flex-1 h-px bg-neo-white/20" />
        </div>

        {/* Email/OTP Form */}
        <form onSubmit={otpSent ? handleOtpSubmit : handleMagicLinkSubmit} className="space-y-3">
          {!otpSent ? (
            <div>
              <label htmlFor="results-email" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
              <input
                id="results-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={t('auth.inlineSignup.emailPlaceholder')}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'results-email-error' : undefined}
                className={cn(
                  'w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
                  emailError ? 'border-red-500' : 'border-neo-cream/20 focus:border-neo-cyan'
                )}
                disabled={isLoading !== null}
              />
              {emailError && (
                <p id="results-email-error" role="alert" className="mt-1 text-xs text-red-400">{emailError}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="results-otp" className="sr-only">{t('auth.otp.enterCode')}</label>
              <input
                id="results-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.otp.enterCode')}
                className="w-full px-4 py-3 rounded-neo border-2 border-neo-cream/20 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan text-center text-2xl tracking-[0.5em] font-mono"
                disabled={isLoading !== null}
              />
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={isLoading !== null || !email || !!emailError || (otpSent && otpCode.length < 6)}
            className="w-full"
          >
            {isLoading === 'magiclink' || isLoading === 'otp' ? (
              <Loader size="sm" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span className="ms-2">
                  {otpSent ? t('auth.otp.verify') : t('auth.magicLink.sendLink')}
                </span>
              </>
            )}
          </Button>
        </form>
      </div>
    </m.div>
  );
};

export default ResultsSignupModal;
