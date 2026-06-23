'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Wand2, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Reveal } from '@/components/ui/Reveal';

import { useLanguage } from '../../contexts/LanguageContext';
import { signInWithMagicLink, sendOtpCode, verifyOtpCode } from '../../lib/supabase';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import { isNative } from '../../utils/platform';
import GoogleSignInButton from './GoogleSignInButton';
import { validateEmail } from '../../utils/validation';
import { cn } from '../../lib/utils';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

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

interface WordHuntLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WordHuntLoginModal: React.FC<WordHuntLoginModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform, showAuthPrompt } = useCrazyGames();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showOtpFlow, setShowOtpFlow] = useState(isNative);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!showOtpFlow && isNative()) setShowOtpFlow(true);
  }, [showOtpFlow]);

  const { signIn: oauthSignIn } = useOAuthSignIn({
    onError: (msg) => setError(msg),
    onSuccess: () => onClose(),
  });

  // On CrazyGames, use their native auth instead of our modal
  useEffect(() => {
    if (isOpen && isOnCrazyGamesPlatform) {
      showAuthPrompt();
      onClose();
    }
  }, [isOpen, isOnCrazyGamesPlatform, showAuthPrompt, onClose]);

  const handleSignIn = async (provider: 'google' | 'discord') => {
    setError(null);
    await oauthSignIn(provider);
  };

  // CrazyGames: route through native auth, never render our modal UI
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
      if (showOtpFlow && otpSent) {
        // Verify OTP code
        const result = await verifyOtpCode(email, otpCode);
        if (result.error) {
          setError(result.error.message);
        } else {
          onClose();
        }
      } else if (showOtpFlow) {
        // Send OTP code
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
      setError((err as Error).message || 'An error occurred');
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        className="max-w-sm bg-neo-navy-light border-orange-500/30"
      >
        <DialogHeader className="bg-transparent border-b-0 p-0">
          <DialogTitle className="sr-only">
            {t('auth.wordHunt.loginTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="p-6 pt-0">
          {/* Content */}
          <Reveal className="text-center mb-6">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('auth.wordHunt.loginTitle')}
            </h2>
            <p className="text-sm text-gray-300">
              {t('auth.wordHunt.loginSubtitle')}
            </p>
          </Reveal>

          {/* Success Message */}
          {success ? (
            <Reveal
              noSlide
              role="status"
              className="mb-4 p-4 rounded-lg bg-emerald-900/30 border border-emerald-500/50 text-center"
            >
              <p className="text-sm font-bold text-emerald-300">{success}</p>
            </Reveal>
          ) : (
            <>
              {/* Sign In Buttons */}
              <Reveal className="space-y-3 mb-4">
                {!isNative() && process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ? (
                  <GoogleSignInButton />
                ) : (
                <Button
                  onClick={() => handleSignIn('google')}
                  disabled={isLoading !== null}
                  className="w-full h-12 bg-white text-gray-800 hover:bg-gray-50 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                  asChild={false}
                >
                  {isLoading === 'google' ? (
                    <Loader size="sm" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span>{t('auth.signInWith', { provider: 'Google' })}</span>
                </Button>
                )}

                <Button
                  onClick={() => handleSignIn('discord')}
                  disabled={isLoading !== null}
                  className="w-full h-12 bg-brand-discord text-white hover:bg-brand-discord-hover font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                  asChild={false}
                >
                  {isLoading === 'discord' ? (
                    <Loader size="sm" />
                  ) : (
                    <DiscordIcon className="w-5 h-5" />
                  )}
                  <span>{t('auth.signInWith', { provider: 'Discord' })}</span>
                </Button>
              </Reveal>

              {/* Email Form (OTP on native, magic link on web) */}
              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full mb-4 text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('auth.inlineSignup.orContinueWith')}</span>
                </button>
              ) : (
                <form
                  onSubmit={handleEmailSubmit}
                  className="mb-4 space-y-3 animate-in fade-in-0 duration-300"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex-1 h-px bg-gray-600" />
                    <span>{t('auth.magicLink.divider')}</span>
                    <div className="flex-1 h-px bg-gray-600" />
                  </div>

                  <div>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder={t('auth.inlineSignup.emailPlaceholder')}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border-2 bg-neo-navy-elevated text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan",
                        emailError ? "border-red-500" : "border-slate-600 focus:border-neo-cyan"
                      )}
                      disabled={isLoading !== null || otpSent}
                    />
                    {emailError && (
                      <p className="mt-1 text-xs text-red-400">{emailError}</p>
                    )}
                  </div>

                  {/* OTP code input (native only, after code sent) */}
                  {showOtpFlow && otpSent && (
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('auth.otp.enterCode')}
                        className="w-full px-4 py-3 rounded-xl border-2 bg-neo-navy-elevated text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan border-slate-600 focus:border-neo-cyan text-center text-2xl tracking-[0.5em] font-mono"
                        disabled={isLoading !== null}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading !== null || !email || !!emailError || (otpSent && otpCode.length < 6)}
                    className="w-full h-12 bg-cyan-500 text-white hover:bg-cyan-600 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                    asChild={false}
                  >
                    {isLoading === 'magiclink' ? (
                      <Loader size="sm" />
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>
                          {otpSent
                            ? t('auth.otp.verify')
                            : showOtpFlow
                              ? t('auth.otp.sendCode')
                              : t('auth.magicLink.sendLink')}
                        </span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <Reveal
              noSlide
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 inline-block me-1" />{error}
            </Reveal>
          )}

          {/* Skip Option */}
          <Reveal noSlide className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('auth.wordHunt.skipCta')}
            </button>
          </Reveal>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default WordHuntLoginModal;
