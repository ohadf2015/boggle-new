'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import Link from 'next/link';
import { Button as ButtonComponent } from '../ui/button';

// Type assertion for JSX Button component
const Button = ButtonComponent as any;
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { signInWithGoogle, signInWithDiscord, signUpWithEmail, signInWithEmail } from '../../lib/supabase';
import { getGuestStatsSummary } from '../../utils/guestManager';
import { cn } from '../../lib/utils';
import { validateEmail, validatePassword } from '../../utils/validation';
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
  color: string;
}

type AuthMode = 'signin' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showGuestStats = false, initialMode = 'signin' }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Email/password form state
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const guestStats: GuestStats | null = showGuestStats ? getGuestStatsSummary() : null;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setShowEmailForm(false);
      setEmail('');
      setPassword('');
      setEmailError(null);
      setPasswordError(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialMode]);

  // Focus trap and keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap
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
  }, [onClose]);

  // Manage focus on open/close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus the first focusable element after a short delay for animation
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
    setIsLoading(provider);
    setError(null);

    try {
      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'discord':
          result = await signInWithDiscord();
          break;
        default:
          throw new Error('Unknown provider');
      }

      if (result.error) {
        setError(result.error.message);
        setIsLoading(null);
      }
      // OAuth will redirect, so no need to close modal
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      setIsLoading(null);
    }
  };

  // Email validation handlers
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
      let result;
      if (authMode === 'signup') {
        result = await signUpWithEmail(email, password);
      } else {
        result = await signInWithEmail(email, password);
      }

      if (result.error) {
        // Handle specific errors
        if (result.error.message.includes('already registered') || result.error.message.includes('already exists')) {
          setError(t('auth.inlineSignup.emailInUse') || 'This email is already registered. Try signing in instead.');
          setAuthMode('signin');
        } else if (result.error.message.includes('Invalid login')) {
          setError(t('auth.invalidCredentials') || 'Invalid email or password');
        } else {
          setError(result.error.message);
        }
        setIsLoading(null);
      } else if (authMode === 'signup') {
        // Signup successful - show confirmation message
        setSuccess(t('auth.inlineSignup.checkEmail') || 'Check your email to verify your account!');
        setIsLoading(null);
      }
      // For signin, the auth context will handle the redirect
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      setIsLoading(null);
    }
  };

  const isAnyLoading = isLoading !== null;

  // Using brand colors from tailwind.config.js for consistency and maintainability
  const providers: Provider[] = [
    { id: 'google', icon: GoogleIcon, label: 'Google', color: 'bg-brand-google text-white hover:bg-brand-google-hover' },
    { id: 'discord', icon: DiscordIcon, label: 'Discord', color: 'bg-brand-discord text-white hover:bg-brand-discord-hover' }
  ];

  if (!isOpen) return null;

  // Use portal to render modal at document body level to avoid transform/filter stacking context issues
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl',
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="auth-modal-title"
              className={cn(
                'text-xl font-bold',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}
            >
              {authMode === 'signup' ? (t('auth.signUp') || 'Sign Up') : t('auth.signIn')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
              aria-label={t('common.close') || 'Close'}
              asChild={false}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Guest Stats Preview */}
          {showGuestStats && guestStats && guestStats.gamesPlayed > 0 && (
            <div className={cn(
              'mb-6 p-4 rounded-xl',
              isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
            )}>
              <p className={cn(
                'text-sm font-medium mb-2',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              )}>
                {t('auth.guestStatsTitle')}
              </p>
              <div className="flex gap-4 text-sm">
                <div className={cn(
                  'flex-1 text-center p-2 rounded-lg',
                  isDarkMode ? 'bg-slate-600' : 'bg-white'
                )}>
                  <div className={cn(
                    'font-bold text-lg',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )}>
                    {guestStats.gamesPlayed}
                  </div>
                  <div className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {t('profile.totalGames')}
                  </div>
                </div>
                <div className={cn(
                  'flex-1 text-center p-2 rounded-lg',
                  isDarkMode ? 'bg-slate-600' : 'bg-white'
                )}>
                  <div className={cn(
                    'font-bold text-lg',
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  )}>
                    {guestStats.totalScore}
                  </div>
                  <div className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {t('profile.totalScore')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={cn(
              'mb-4 p-4 rounded-xl text-center',
              isDarkMode ? 'bg-emerald-900/30 border border-emerald-500' : 'bg-emerald-100 border border-emerald-500'
            )}>
              <p className={cn(
                'text-sm font-bold',
                isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
              )}>{success}</p>
            </div>
          )}

          {!success && (
            <>
              {/* OAuth Buttons */}
              <div className="space-y-3">
                {providers.map((provider) => (
                  <Button
                    key={provider.id}
                    onClick={() => handleSignIn(provider.id)}
                    disabled={isAnyLoading}
                    className={cn(
                      'w-full h-12 text-base font-medium rounded-xl transition-all',
                      provider.color
                    )}
                    asChild={false}
                  >
                    {isLoading === provider.id ? (
                      <NeoLoader variant="dots" size="sm" />
                    ) : (
                      <provider.icon className="w-5 h-5" />
                    )}
                    <span className="ml-2">
                      {t('auth.signInWith', { provider: provider.label })}
                    </span>
                  </Button>
                ))}
              </div>

              {/* Email Form Toggle */}
              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className={cn(
                    'w-full mt-4 text-sm flex items-center justify-center gap-2 transition-colors',
                    isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                  )}
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('auth.inlineSignup.orContinueWith') || 'or continue with email'}</span>
                </button>
              ) : (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleEmailSubmit}
                  className="mt-4 space-y-3"
                >
                  {/* Divider */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className={cn('flex-1 h-px', isDarkMode ? 'bg-slate-600' : 'bg-gray-300')} />
                    <span>{authMode === 'signup' ? 'Create account' : 'Sign in with email'}</span>
                    <div className={cn('flex-1 h-px', isDarkMode ? 'bg-slate-600' : 'bg-gray-300')} />
                  </div>

                  {/* Email Input */}
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder={t('auth.inlineSignup.emailPlaceholder') || 'Email address'}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all',
                        isDarkMode ? 'bg-slate-700 text-white placeholder-gray-400' : 'bg-gray-50 text-gray-900 placeholder-gray-400',
                        emailError ? 'border-red-500' : (isDarkMode ? 'border-slate-600' : 'border-gray-200')
                      )}
                      disabled={isAnyLoading}
                    />
                    {emailError && (
                      <p className="mt-1 text-xs text-red-500">{emailError}</p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder={t('auth.inlineSignup.passwordPlaceholder') || 'Password (8+ characters)'}
                        className={cn(
                          'w-full px-4 py-3 pr-12 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all',
                          isDarkMode ? 'bg-slate-700 text-white placeholder-gray-400' : 'bg-gray-50 text-gray-900 placeholder-gray-400',
                          passwordError ? 'border-red-500' : (isDarkMode ? 'border-slate-600' : 'border-gray-200')
                        )}
                        disabled={isAnyLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                          'absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 transition-colors',
                          isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                        )}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-xs text-red-500">{passwordError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isAnyLoading || !email || !password || !!emailError || !!passwordError}
                    className={cn(
                      'w-full h-12 text-base font-medium rounded-xl transition-all',
                      'bg-cyan-500 text-white hover:bg-cyan-600'
                    )}
                    asChild={false}
                  >
                    {isLoading === 'email' ? (
                      <NeoLoader variant="dots" size="sm" />
                    ) : (
                      authMode === 'signup'
                        ? (t('auth.inlineSignup.signUpButton') || 'Create Account')
                        : (t('auth.signIn') || 'Sign In')
                    )}
                  </Button>

                  {/* Toggle auth mode */}
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                    className={cn(
                      'w-full text-xs transition-colors',
                      isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {authMode === 'signup'
                      ? (t('auth.alreadyHaveAccount') || 'Already have an account? Sign in')
                      : (t('auth.noAccount') || "Don't have an account? Sign up")}
                  </button>
                </motion.form>
              )}

              {/* Error Message */}
              {error && (
                <div className={cn(
                  'mt-4 p-3 rounded-lg text-sm',
                  isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                )}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Continue as Guest */}
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-700'
              )}
            >
              {t('auth.continueAsGuest')}
            </button>
          </div>

          {/* Terms */}
          <p className={cn(
            'mt-4 text-xs text-center',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            {t('auth.termsPrefix')}{' '}
            <Link
              href={`/${language}/legal/terms`}
              className={cn(
                'underline transition-colors',
                isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {t('auth.termsLink')}
            </Link>
            {' '}{t('auth.andText')}{' '}
            <Link
              href={`/${language}/legal/privacy`}
              className={cn(
                'underline transition-colors',
                isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {t('auth.privacyLink')}
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;
