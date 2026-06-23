'use client';

import React, { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { X, Mail, Eye, EyeOff, Wand2, Shield, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Reveal } from '@/components/ui/Reveal';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import { signUpWithEmail, signInWithEmail, signInWithMagicLink, sendOtpCode, verifyOtpCode } from '../../lib/supabase';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import GoogleSignInButton from './GoogleSignInButton';
import { trackEvent } from '@/components/GoogleAnalytics';
import { isNative } from '../../utils/platform';

import { getGuestStatsSummary } from '../../utils/guestManager';
import { cn } from '../../lib/utils';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useErrorShake } from '@/hooks/useErrorShake';

/** Quick fade+slide entrance for a validation error appearing under a field. */
const ERROR_ENTER = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.15 },
} as const;

// Brand icon SVG components
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showGuestStats?: boolean;
  initialMode?: 'signin' | 'signup';
}

interface GuestStats {
  gamesPlayed: number;
  totalScore: number;
}

interface Provider {
  id: 'google' | 'discord';
  icon: React.FC<{ className?: string }>;
  label: string;
  className: string;
}

type AuthMode = 'signin' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showGuestStats = false, initialMode = 'signin' }) => {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Modal-level `error` is only set on a failed submit (server rejection / invalid
  // credentials), never per-keystroke — so shaking on it is the canonical
  // "login rejected" feedback without firing while the user types.
  const errorShake = useErrorShake(error);
  const [success, setSuccess] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { isOnCrazyGamesPlatform, showAuthPrompt } = useCrazyGames();
  useFocusTrap(modalRef, isOpen, onClose);

  // On CrazyGames, skip the modal entirely — trigger native CG auth prompt
  useEffect(() => {
    if (isOpen && isOnCrazyGamesPlatform) {
      showAuthPrompt();
      onClose();
    }
  }, [isOpen, isOnCrazyGamesPlatform, showAuthPrompt, onClose]);

  // Email/password form state
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<'enter-email' | 'enter-code'>('enter-email');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear OTP interval on unmount
  useEffect(() => {
    return () => {
      if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    };
  }, []);

  const guestStats: GuestStats | null = showGuestStats ? getGuestStatsSummary() : null;

  // OAuth sign-in with native SDK priority (Google/Apple native → in-app browser → redirect)
  const handleOAuthError = useCallback((msg: string) => setError(msg), []);
  const handleOAuthSuccess = useCallback(() => onClose(), [onClose]);
  const { signIn: oauthSignIn, loadingProvider: oauthLoadingProvider } = useOAuthSignIn({
    onError: handleOAuthError,
    onSuccess: handleOAuthSuccess,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setUsePassword(false);
      setEmail('');
      setPassword('');
      setEmailError(null);
      setPasswordError(null);
      setError(null);
      setSuccess(null);
      setOtpStep('enter-email');
      setOtpCode('');
      setOtpCooldown(0);
    }
  }, [isOpen, initialMode]);

  // Focus trap and keyboard handling
  // Escape is handled by useFocusTrap — only handle Tab here
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  const handleSignIn = async (provider: 'google' | 'discord') => {
    setError(null);
    await oauthSignIn(provider);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) {
      const result = validateEmail(value);
      setEmailError(result.isValid ? null : (result.error ? t(result.error) : null));
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) {
      const result = validatePassword(value);
      setPasswordError(result.isValid ? null : (result.error ? t(result.error) : null));
    } else {
      setPasswordError(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error ? t(emailValidation.error) : 'Invalid email');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error ? t(passwordValidation.error) : 'Invalid password');
      return;
    }

    setIsLoading('email');
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    try {
      const result = authMode === 'signup'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (result.error) {
        if (result.error.message.includes('already registered') || result.error.message.includes('already exists')) {
          setError(t('auth.inlineSignup.emailInUse'));
          setAuthMode('signin');
        } else if (result.error.message.includes('Invalid login')) {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(result.error.message);
        }
        setIsLoading(null);
      } else if (authMode === 'signup') {
        trackEvent('funnel_sign_up', { method: 'password' });
        setSuccess(t('auth.inlineSignup.checkEmail'));
        setIsLoading(null);
      }
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
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
      const result = await signInWithMagicLink(email);

      if (result.error) {
        setError(result.error.message);
      } else {
        trackEvent('funnel_sign_up', { method: 'magic_link' });
        setSuccess(t('auth.magicLink.checkEmail'));
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  const handleOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error ? t(emailValidation.error) : 'Invalid email');
      return;
    }

    setIsLoading('otp');
    setError(null);
    setEmailError(null);

    try {
      const result = await sendOtpCode(email);
      if (result.error) {
        setError(result.error.message);
      } else {
        setOtpStep('enter-code');
        // Start 60s cooldown (Supabase rate limit)
        setOtpCooldown(60);
        if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
        otpIntervalRef.current = setInterval(() => {
          setOtpCooldown((prev) => {
            if (prev <= 1) { if (otpIntervalRef.current) { clearInterval(otpIntervalRef.current); otpIntervalRef.current = null; } return 0; }
            return prev - 1;
          });
        }, 1000);
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    setIsLoading('otp-verify');
    setError(null);

    try {
      const result = await verifyOtpCode(email, otpCode);
      if (result.error) {
        setError(result.error.message);
      } else {
        onClose();
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  const isAnyLoading = isLoading !== null || oauthLoadingProvider !== null;
  // Use OTP on native — magic links open Safari and never return to the app.
  // Re-check on mount in case Capacitor bridge initializes after first render.
  const [showOtpFlow, setShowOtpFlow] = useState(isNative);
  useEffect(() => {
    if (!showOtpFlow && isNative()) setShowOtpFlow(true);
  }, [showOtpFlow]);

  const allProviders: Provider[] = [
    {
      id: 'google',
      icon: GoogleIcon,
      label: 'Google',
      className: 'bg-white text-gray-800 border-3 border-neo-black hover:bg-gray-50 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
    },
    {
      id: 'discord',
      icon: DiscordIcon,
      label: 'Discord',
      className: 'bg-brand-discord text-white border-3 border-neo-black hover:bg-brand-discord-hover shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
    },
  ];
  // On native, only show Google (Discord requires browser OAuth which leaves the app)
  const providers = isNative() ? allProviders.filter(p => p.id === 'google') : allProviders;
  // On web with a Google web client, use Google's in-page token button
  // (signInWithIdToken) so the consent screen shows OUR domain, not <ref>.supabase.co.
  const useGsiGoogleButton = !isNative() && !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Backdrop + panel use CSS entrance animations (tailwindcss-animate), NOT
  // framer-motion. JS-driven entrance animations can leave the panel pinned at
  // its invisible `initial` state when the main thread is starved (e.g. parsing
  // the large Hebrew translation bundle), which rendered the modal as just the
  // dark backdrop. CSS animations run off the main thread and always settle to
  // the visible resting state, so the panel can never get stuck invisible.
  return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-neo border-3 border-neo-black bg-neo-navy p-6 shadow-hard-lg animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                id="auth-modal-title"
                className="text-2xl font-black text-white font-neo-display"
              >
                {authMode === 'signup' ? (t('auth.signUp')) : (t('auth.signIn'))}
              </h2>
              <p className="text-sm text-gray-300 mt-0.5">
                {t('auth.upgradePrompt')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-neo border-2 border-slate-600 hover:border-white hover:bg-white/10 transition-all text-gray-300 hover:text-white"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Guest Stats Preview */}
          {showGuestStats && guestStats && guestStats.gamesPlayed > 0 && (
            <div className="mb-5 p-3 rounded-neo border-2 border-neo-cyan/30 bg-neo-cyan/5">
              <p className="text-xs font-bold text-neo-cyan mb-2">
                {t('auth.guestStatsTitle')}
              </p>
              <div className="flex gap-3 text-sm">
                <div className="flex-1 text-center p-2 rounded-lg bg-neo-navy-light/50">
                  <div className="font-black text-lg text-neo-cyan">
                    {guestStats.gamesPlayed}
                  </div>
                  <div className="text-[10px] text-gray-300 uppercase tracking-wide">
                    {t('profile.totalGames')}
                  </div>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-neo-navy-light/50">
                  <div className="font-black text-lg text-neo-pink">
                    {guestStats.totalScore}
                  </div>
                  <div className="text-[10px] text-gray-300 uppercase tracking-wide">
                    {t('profile.totalScore')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <m.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="mb-4 p-4 rounded-neo border-3 border-emerald-400 bg-emerald-500/10 text-center shadow-hard-sm"
              >
                <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-300">{success}</p>
              </m.div>
            )}
          </AnimatePresence>

          {!success && (
            <>
              {/* OAuth Buttons */}
              {isOnCrazyGamesPlatform ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => showAuthPrompt()}
                    disabled={isAnyLoading}
                    className="w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black hover:bg-neo-lime-light shadow-hard transition-all"
                    asChild={false}
                  >
                    {isLoading === 'crazygames' ? (
                      <Loader size="sm" />
                    ) : (
                      <span>{t('auth.loginCrazyGames')}</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {providers.map((provider) => (
                    <Reveal key={provider.id}>
                      {provider.id === 'google' && useGsiGoogleButton ? (
                        <GoogleSignInButton />
                      ) : (
                      <Button
                        onClick={() => handleSignIn(provider.id)}
                        disabled={isAnyLoading}
                        className={cn(
                          'w-full h-12 text-base font-bold rounded-neo transition-all flex items-center justify-center gap-2',
                          provider.className
                        )}
                        asChild={false}
                      >
                        {(isLoading === provider.id || oauthLoadingProvider === provider.id) ? (
                          <Loader size="sm" />
                        ) : (
                          <>
                            <provider.icon className="w-5 h-5" />
                            <span>{t('auth.signInWith', { provider: provider.label })}</span>
                          </>
                        )}
                      </Button>
                      )}
                    </Reveal>
                  ))}
                </div>
              )}

              {/* Divider + Email Section — always visible (no toggle) */}
              {!isOnCrazyGamesPlatform && (
                <div className="mt-5">
                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-slate-600" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t('auth.magicLink.divider')}
                    </span>
                    <div className="flex-1 h-px bg-slate-600" />
                  </div>

                  {!usePassword ? (
                    showOtpFlow ? (
                      /* OTP Code Form (native — no browser redirect) */
                      otpStep === 'enter-email' ? (
                        <form onSubmit={handleOtpSend} className="space-y-3">
                          <div>
                            <label htmlFor="otp-email-input" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
                            <input
                              id="otp-email-input"
                              type="email"
                              autoComplete="email"
                              value={email}
                              onChange={(e) => handleEmailChange(e.target.value)}
                              placeholder={t('auth.inlineSignup.emailPlaceholder')}
                              aria-invalid={emailError ? true : undefined}
                              aria-describedby={emailError ? 'otp-email-error' : undefined}
                              className={cn(
                                'w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500',
                                'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors',
                                emailError ? 'border-red-500' : 'border-slate-600 focus:border-neo-cyan'
                              )}
                              disabled={isAnyLoading}
                              spellCheck={false}
                            />
                            {emailError && (
                              <m.p id="otp-email-error" role="alert" className="mt-1 text-xs text-red-400" {...ERROR_ENTER}>{emailError}</m.p>
                            )}
                          </div>
                          <Button
                            type="submit"
                            disabled={isAnyLoading || !email || !!emailError}
                            className="w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all flex items-center justify-center gap-2"
                            asChild={false}
                          >
                            {isLoading === 'otp' ? (
                              <Loader size="sm" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                <span>{t('auth.otp.sendCode')}</span>
                              </>
                            )}
                          </Button>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {t('auth.otp.noPassword')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setUsePassword(true)}
                              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              {t('auth.magicLink.usePassword')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleOtpVerify} className="space-y-3">
                          <p className="text-sm text-gray-300 mb-2">
                            {t('auth.otp.codeSentTo')} <span className="font-bold text-white">{email}</span>
                          </p>
                          <div>
                            <label htmlFor="otp-code-input" className="sr-only">{t('auth.otp.codeSentTo')}</label>
                            <input
                              id="otp-code-input"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500 text-center text-2xl tracking-[0.5em] font-mono focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors border-slate-600 focus:border-neo-cyan"
                              disabled={isAnyLoading}
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={isAnyLoading || otpCode.length !== 6}
                            className="w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all"
                            asChild={false}
                          >
                            {isLoading === 'otp-verify' ? (
                              <Loader size="sm" />
                            ) : (
                              t('auth.otp.verify')
                            )}
                          </Button>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => { setOtpStep('enter-email'); setOtpCode(''); setError(null); }}
                              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              {t('auth.otp.changeEmail')}
                            </button>
                            <button
                              type="button"
                              onClick={handleOtpSend as unknown as React.MouseEventHandler}
                              disabled={otpCooldown > 0}
                              className="text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-40"
                            >
                              {otpCooldown > 0 ? `${t('auth.otp.resend')} (${otpCooldown}s)` : t('auth.otp.resend')}
                            </button>
                          </div>
                        </form>
                      )
                    ) : (
                    /* Magic Link Form (web — no password needed) */
                    <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                      <div>
                        <label htmlFor="magic-email-input" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
                        <input
                          id="magic-email-input"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder={t('auth.inlineSignup.emailPlaceholder')}
                          aria-invalid={emailError ? true : undefined}
                          aria-describedby={emailError ? 'magic-email-error' : undefined}
                          className={cn(
                            'w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500',
                            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors',
                            emailError ? 'border-red-500' : 'border-slate-600 focus:border-neo-cyan'
                          )}
                          disabled={isAnyLoading}
                          spellCheck={false}
                        />
                        {emailError && (
                          <m.p id="magic-email-error" role="alert" className="mt-1 text-xs text-red-400" {...ERROR_ENTER}>{emailError}</m.p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={isAnyLoading || !email || !!emailError}
                        className="w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all flex items-center justify-center gap-2"
                        asChild={false}
                      >
                        {isLoading === 'magiclink' ? (
                          <Loader size="sm" />
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            <span>{t('auth.magicLink.sendLink')}</span>
                          </>
                        )}
                      </Button>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          {t('auth.magicLink.noPassword')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUsePassword(true)}
                          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {t('auth.magicLink.usePassword')}
                        </button>
                      </div>
                    </form>
                    )
                  ) : (
                    /* Password Form */
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <div>
                        <label htmlFor="pwd-email-input" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
                        <input
                          id="pwd-email-input"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder={t('auth.inlineSignup.emailPlaceholder')}
                          aria-invalid={emailError ? true : undefined}
                          aria-describedby={emailError ? 'pwd-email-error' : undefined}
                          className={cn(
                            'w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500',
                            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors',
                            emailError ? 'border-red-500' : 'border-slate-600 focus:border-neo-cyan'
                          )}
                          disabled={isAnyLoading}
                          spellCheck={false}
                        />
                        {emailError && (
                          <m.p id="pwd-email-error" role="alert" className="mt-1 text-xs text-red-400" {...ERROR_ENTER}>{emailError}</m.p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="pwd-password-input" className="sr-only">{t('auth.inlineSignup.passwordPlaceholder')}</label>
                        <div className="relative">
                          <input
                            id="pwd-password-input"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            placeholder={t('auth.inlineSignup.passwordPlaceholder')}
                            aria-invalid={passwordError ? true : undefined}
                            aria-describedby={passwordError ? 'pwd-password-error' : undefined}
                            className={cn(
                              'w-full px-4 py-3 pe-12 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500',
                              'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors',
                              passwordError ? 'border-red-500' : 'border-slate-600 focus:border-neo-cyan'
                            )}
                            disabled={isAnyLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? (t('auth.hidePassword')) : (t('auth.showPassword'))}
                            className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-200 transition-colors rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                          </button>
                        </div>
                        {passwordError && (
                          <m.p id="pwd-password-error" role="alert" className="mt-1 text-xs text-red-400" {...ERROR_ENTER}>{passwordError}</m.p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={isAnyLoading || !email || !password || !!emailError || !!passwordError}
                        className="w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all"
                        asChild={false}
                      >
                        {isLoading === 'email' ? (
                          <Loader size="sm" />
                        ) : (
                          authMode === 'signup'
                            ? (t('auth.inlineSignup.signUpButton'))
                            : (t('auth.signIn'))
                        )}
                      </Button>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {authMode === 'signup'
                            ? (t('auth.alreadyHaveAccount'))
                            : (t('auth.noAccount'))}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsePassword(false)}
                          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {t('auth.magicLink.useMagicLink')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <m.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-4 p-3 rounded-neo border-2 border-red-500/50 bg-red-500/10 text-sm text-red-300"
                    role="alert"
                  >
                    <m.span className="flex items-center gap-2" animate={errorShake}>
                      <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </m.span>
                  </m.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Continue as Guest */}
          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              {t('auth.continueAsGuest')}
            </button>
          </div>

          {/* Trust Signal + Terms */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>{t('auth.trustBadge')}</span>
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              {t('auth.termsPrefix')}{' '}
              <Link
                href={`/${language}/legal/terms`}
                className="underline hover:text-gray-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {t('auth.termsLink')}
              </Link>
              {' '}{t('auth.andText')}{' '}
              <Link
                href={`/${language}/legal/privacy`}
                className="underline hover:text-gray-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {t('auth.privacyLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>,
    document.body
  );
};

export default AuthModal;
