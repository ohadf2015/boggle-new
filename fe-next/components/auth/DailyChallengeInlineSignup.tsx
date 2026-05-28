'use client';

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, Smartphone, BarChart3, Mail, Eye, EyeOff, X, Sparkles, Wand2, AlertCircle, type LucideIcon } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import Link from 'next/link';
import { Button } from '../ui/button';
import { InteractiveMascot } from '../ui/InteractiveMascot';
import { useLanguage } from '../../contexts/LanguageContext';
import { signUpWithEmail, signInWithEmail, signInWithMagicLink, sendOtpCode, verifyOtpCode } from '../../lib/supabase';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import { isNative } from '../../utils/platform';
import { cn } from '../../lib/utils';
import { setPendingDailyResult, type WordHuntResult } from '../../utils/dailyChallenge';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { Language } from '@/types';

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

interface DailyChallengeInlineSignupProps {
  pendingResult: {
    result: WordHuntResult;
    puzzleNumber: number;
    puzzleDate: string;
    language: Language;
  };
  onDismiss?: () => void;
  className?: string;
}

interface Benefit {
  icon: LucideIcon;
  key: string;
}

type AuthMode = 'signup' | 'signin';

// Funny mascot messages that rotate
const MASCOT_MESSAGES = [
  'funnyMessages.dontLeaveHanging',
  'funnyMessages.scoresTooGood',
  'funnyMessages.streakProtector',
  'funnyMessages.joinWordNerds',
  'funnyMessages.makeMomProud',
];

export const DailyChallengeInlineSignup: React.FC<DailyChallengeInlineSignupProps> = ({
  pendingResult,
  onDismiss,
  className,
}) => {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [showOtpFlow, setShowOtpFlow] = useState(isNative);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!showOtpFlow && isNative()) setShowOtpFlow(true);
  }, [showOtpFlow]);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Pick a random funny message - use lazy state initializer to run once
  const [randomMessage] = useState(
    () => MASCOT_MESSAGES[Math.floor(Math.random() * MASCOT_MESSAGES.length)]
  );

  const { signIn: oauthSignIn } = useOAuthSignIn({
    onBeforeRedirect: () => setPendingDailyResult(pendingResult),
    onError: (msg) => setError(msg),
  });

  // Hide signup UI entirely on CrazyGames — they use their own auth
  if (isOnCrazyGamesPlatform) return null;

  const handleOAuthSignIn = async (provider: 'google' | 'discord') => {
    setError(null);
    setPendingDailyResult(pendingResult);
    await oauthSignIn(provider);
  };

  // Real-time validation handlers
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

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error ? t(emailValidation.error) : 'Invalid email');
      return;
    }

    // Validate password
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
      // Store pending result before auth
      setPendingDailyResult(pendingResult);

      let result;
      if (authMode === 'signup') {
        result = await signUpWithEmail(email, password);
      } else {
        result = await signInWithEmail(email, password);
      }

      if (result.error) {
        // Handle specific errors
        if (result.error.message.includes('already registered') || result.error.message.includes('already exists')) {
          setError(t('auth.inlineSignup.emailInUse'));
          setAuthMode('signin');
        } else {
          setError(result.error.message);
        }
        setIsLoading(null);
      } else if (authMode === 'signup') {
        // Signup successful - show confirmation message
        setSuccess(t('auth.inlineSignup.checkEmail'));
        setIsLoading(null);
      }
      // For signin, the auth context will handle the redirect
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
      setPendingDailyResult(pendingResult);

      if (showOtpFlow && otpSent) {
        // Verify OTP code
        const result = await verifyOtpCode(email, otpCode);
        if (result.error) {
          setError(result.error.message);
        }
        // Auth context handles redirect on success
      } else if (showOtpFlow) {
        // Send OTP code (native — no browser redirect)
        const result = await sendOtpCode(email);
        if (result.error) {
          setError(result.error.message);
        } else {
          setOtpSent(true);
          setSuccess(t('auth.otp.codeSent'));
        }
      } else {
        // Web: magic link
        const result = await signInWithMagicLink(email);
        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccess(t('auth.magicLink.checkEmail'));
        }
      }
      setIsLoading(null);
    } catch (err) {
      setError((err as Error).message || t('common.errorOccurred'));
      setIsLoading(null);
    }
  };

  const benefits: Benefit[] = [
    { icon: Trophy, key: 'allTimeLeaderboard' },
    { icon: Shield, key: 'protectStreak' },
    { icon: Smartphone, key: 'syncDevices' },
    { icon: BarChart3, key: 'trackStats' },
  ];

  const isAnyLoading = isLoading !== null;

  return (
    <m.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      {/* Blurred background layer - mimics content behind */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-neo-navy/95 via-slate-900/95 to-neo-navy/95 backdrop-blur-xl" />
        {/* Decorative blurred "fake" content shapes */}
        <div className="absolute top-4 left-4 right-4 h-8 bg-neo-navy-light/30 rounded-lg blur-xs" />
        <div className="absolute top-16 left-4 w-24 h-24 bg-neo-lime/10 rounded-full blur-md" />
        <div className="absolute top-20 right-8 w-16 h-4 bg-neo-navy-light/30 rounded blur-xs" />
        <div className="absolute bottom-8 left-8 right-8 h-12 bg-neo-navy-light/20 rounded-lg blur-xs" />
      </div>

      {/* Main card with glass effect */}
      <div className="relative rounded-neo border-3 border-neo-lime/50 bg-neo-navy/90 shadow-hard-lg p-5 backdrop-blur-xs">
        {/* Sparkle decorations */}
        <div className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2">
          <m.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-6 h-6 text-neo-lime" />
          </m.div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
            aria-label={t('common.dismiss')}
          >
            <X className="w-4 h-4 text-neo-white hover:text-white" />
          </button>
        )}

        {/* Mascot with speech bubble */}
        <div className="flex items-start gap-3 mb-4">
          {/* Mascot */}
          <m.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="shrink-0"
          >
            <InteractiveMascot
              variant="excited"
              size="lg"
              enableHover
              enableClick
              clickAnimation="wiggle"
              tooltip={t('auth.inlineSignup.mascotTooltip')}
            />
          </m.div>

          {/* Speech bubble */}
          <m.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="relative flex-1 bg-neo-lime rounded-neo border-3 border-neo-black p-3 shadow-hard-sm"
          >
            {/* Speech bubble tail */}
            <div className="absolute left-0 rtl:left-auto rtl:right-0 top-4 -translate-x-2 rtl:translate-x-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 rtl:border-r-0 rtl:border-l-8 border-r-neo-black rtl:border-l-neo-black" />
            <div className="absolute left-0 rtl:left-auto rtl:right-0 top-4 -translate-x-[5px] rtl:translate-x-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] rtl:border-r-0 rtl:border-l-[6px] border-r-neo-lime rtl:border-l-neo-lime" />

            <p className="text-neo-black font-black text-sm leading-tight">
              {t(`auth.inlineSignup.${randomMessage}`) || t('auth.inlineSignup.funnyMessages.dontLeaveHanging')}
            </p>
          </m.div>
        </div>

        {/* Title */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-4"
        >
          <h3 className="text-xl font-black text-white">
            {t('auth.inlineSignup.title')}
          </h3>
          <p className="text-sm text-neo-white mt-1">
            {t('auth.inlineSignup.subtitle')}
          </p>
        </m.div>

        {/* Benefits Grid - compact */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-2 mb-4 p-3 bg-neo-navy-light/50 rounded-lg border border-neo-cream/15/50"
        >
          {benefits.map((benefit, idx) => (
            <m.div
              key={benefit.key}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
              className="flex items-center gap-2 text-xs"
            >
              <benefit.icon className="w-4 h-4 text-neo-cyan shrink-0" />
              <span className="text-neo-white">
                {t(`auth.dailyChallenge.benefits.${benefit.key}`) || benefit.key}
              </span>
            </m.div>
          ))}
        </m.div>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-3 mb-4 text-center"
            >
              <p className="text-sm font-bold text-neo-lime">{success}</p>
            </m.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-red-500/20 border-2 border-red-500 rounded-neo p-3 mb-4 text-center"
              role="alert"
            >
              <p className="text-sm font-bold text-red-300 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>
            </m.div>
          )}
        </AnimatePresence>

        {!success && (
          <>
            {/* OAuth Buttons */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2 mb-4"
            >
              <Button
                onClick={() => handleOAuthSignIn('google')}
                disabled={isAnyLoading}
                className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all font-bold flex items-center justify-center gap-2"
              >
                {isLoading === 'google' ? (
                  <Loader size="sm" />
                ) : (
                  <>
                    <GoogleIcon className="w-5 h-5" />
                    <span>{t('auth.continueWithGoogle')}</span>
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleOAuthSignIn('discord')}
                disabled={isAnyLoading}
                className="w-full py-3 bg-brand-discord hover:bg-brand-discord-hover text-white border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all font-bold flex items-center justify-center gap-2"
              >
                {isLoading === 'discord' ? (
                  <Loader size="sm" />
                ) : (
                  <>
                    <DiscordIcon className="w-5 h-5" />
                    <span>{t('auth.continueWithDiscord')}</span>
                  </>
                )}
              </Button>
            </m.div>

            {/* Email Form Toggle */}
            {!showEmailForm ? (
              <m.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={() => setShowEmailForm(true)}
                className="w-full text-sm text-neo-white hover:text-neo-white transition-colors flex items-center justify-center gap-2 py-2"
              >
                <Mail className="w-4 h-4" />
                <span>{t('auth.inlineSignup.orContinueWith')}</span>
              </m.button>
            ) : (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="space-y-3"
              >
                {/* Divider */}
                <div className="flex items-center gap-2 text-xs text-neo-white">
                  <div className="flex-1 h-px bg-gray-600" />
                  <span>{t('auth.magicLink.divider')}</span>
                  <div className="flex-1 h-px bg-gray-600" />
                </div>

                {!usePassword ? (
                  /* Magic Link Form (default) */
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="dc-magic-email" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
                      <input
                        id="dc-magic-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder={t('auth.inlineSignup.emailPlaceholder')}
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={emailError ? 'dc-magic-email-error' : undefined}
                        className={cn(
                          "w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan",
                          emailError ? "border-red-500" : "border-neo-cream/20 focus:border-neo-cyan"
                        )}
                        disabled={isAnyLoading || otpSent}
                      />
                      {emailError && (
                        <p id="dc-magic-email-error" role="alert" className="mt-1 text-xs text-red-400">{emailError}</p>
                      )}
                    </div>

                    {/* OTP code input (native only, after code sent) */}
                    {showOtpFlow && otpSent && (
                      <div>
                        <label htmlFor="dc-otp-code" className="sr-only">{t('auth.otp.enterCode')}</label>
                        <input
                          id="dc-otp-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder={t('auth.otp.enterCode')}
                          className="w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan border-neo-cream/20 focus:border-neo-cyan text-center text-2xl tracking-[0.5em] font-mono"
                          disabled={isAnyLoading}
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isAnyLoading || !email || !!emailError || (otpSent && otpCode.length < 6)}
                      className="w-full"
                    >
                      {isLoading === 'magiclink' ? (
                        <Loader size="sm" />
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          <span className="ms-2">
                            {otpSent
                              ? t('auth.otp.verify')
                              : showOtpFlow
                                ? t('auth.otp.sendCode')
                                : t('auth.magicLink.sendLink')}
                          </span>
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setUsePassword(true)}
                      className="w-full text-xs text-neo-white hover:text-neo-white"
                    >
                      {t('auth.magicLink.usePassword')}
                    </button>
                  </form>
                ) : (
                  /* Password Form */
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="dc-pwd-email" className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
                      <input
                        id="dc-pwd-email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder={t('auth.inlineSignup.emailPlaceholder')}
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={emailError ? 'dc-pwd-email-error' : undefined}
                        className={cn(
                          "w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan",
                          emailError ? "border-red-500" : "border-neo-cream/20 focus:border-neo-cyan"
                        )}
                        disabled={isAnyLoading}
                      />
                      {emailError && (
                        <p id="dc-pwd-email-error" role="alert" className="mt-1 text-xs text-red-400">{emailError}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="dc-pwd-password" className="sr-only">{t('auth.inlineSignup.passwordPlaceholder')}</label>
                      <div className="relative">
                        <input
                          id="dc-pwd-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          placeholder={t('auth.inlineSignup.passwordPlaceholder')}
                          aria-invalid={passwordError ? true : undefined}
                          aria-describedby={passwordError ? 'dc-pwd-password-error' : undefined}
                          className={cn(
                            "w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-neo-cream/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan pe-12",
                            passwordError ? "border-red-500" : "border-neo-cream/20 focus:border-neo-cyan"
                          )}
                          disabled={isAnyLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-neo-white hover:text-neo-white"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordError && (
                        <p id="dc-pwd-password-error" role="alert" className="mt-1 text-xs text-red-400">{passwordError}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isAnyLoading || !email || !password || !!emailError || !!passwordError}
                      className="w-full"
                    >
                      {isLoading === 'email' ? (
                        <Loader size="sm" />
                      ) : (
                        authMode === 'signup'
                          ? (t('auth.inlineSignup.signUpButton'))
                          : t('auth.signIn')
                      )}
                    </Button>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                        className="text-xs text-neo-white hover:text-neo-white"
                      >
                        {authMode === 'signup'
                          ? t('auth.alreadyHaveAccount')
                          : t('auth.noAccount')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsePassword(false)}
                        className="text-xs text-neo-white hover:text-neo-white"
                      >
                        {t('auth.magicLink.useMagicLink')}
                      </button>
                    </div>
                  </form>
                )}
              </m.div>
            )}

            {/* Continue as Guest - more prominent with humor */}
            {onDismiss && (
              <m.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onDismiss}
                className="w-full mt-4 text-sm text-neo-white hover:text-neo-white transition-colors group"
              >
                <span className="group-hover:hidden">
                  {t('auth.inlineSignup.skipForNow')}
                </span>
                <span className="hidden group-hover:inline text-neo-lime">
                  {t('auth.inlineSignup.skipHover')}
                </span>
              </m.button>
            )}
          </>
        )}

        {/* Terms & Privacy */}
        <div className="mt-4 text-center text-[10px] text-neo-white">
          {t('auth.termsPrefix')}{' '}
          <Link href={`/${language}/legal/terms`} className="underline hover:text-neo-white transition-colors">
            {t('auth.termsLink')}
          </Link>
          {' '}{t('auth.andText')}{' '}
          <Link href={`/${language}/legal/privacy`} className="underline hover:text-neo-white transition-colors">
            {t('auth.privacyLink')}
          </Link>
        </div>
      </div>
    </m.div>
  );
};

export default DailyChallengeInlineSignup;
