/**
 * Email authentication forms for AuthModal — OTP, Magic Link, and Password forms.
 * Extracted from AuthModal.tsx for file size management.
 */
import React from 'react';
import { Mail, Eye, EyeOff, Wand2, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AuthMode = 'signin' | 'signup';

interface SharedFormProps {
  email: string;
  emailError: string | null;
  isAnyLoading: boolean;
  isLoading: string | null;
  onEmailChange: (value: string) => void;
  onSwitchToPassword: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

interface OtpEmailFormProps extends SharedFormProps {
  onSubmit: (e: React.FormEvent) => void;
}

interface OtpVerifyFormProps {
  email: string;
  otpCode: string;
  otpCooldown: number;
  isAnyLoading: boolean;
  isLoading: string | null;
  onOtpChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: (e: React.FormEvent) => void;
  onChangeEmail: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

interface MagicLinkFormProps extends SharedFormProps {
  onSubmit: (e: React.FormEvent) => void;
}

interface PasswordFormProps extends Omit<SharedFormProps, 'onSwitchToPassword'> {
  password: string;
  passwordError: string | null;
  showPassword: boolean;
  authMode: AuthMode;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleAuthMode: () => void;
  onSwitchToMagicLink: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EMAIL_INPUT_CLASS = 'w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors';
const SUBMIT_BTN_CLASS = 'w-full h-12 text-base font-bold rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all';

function EmailInput({ id, value, onChange, error, errorId, disabled, t }: {
  id: string; value: string; onChange: (v: string) => void;
  error: string | null; errorId: string; disabled: boolean;
  t: (key: string) => string;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">{t('auth.inlineSignup.emailPlaceholder')}</label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('auth.inlineSignup.emailPlaceholder')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(EMAIL_INPUT_CLASS, error ? 'border-red-500' : 'border-slate-600 focus:border-neo-cyan')}
        disabled={disabled}
        spellCheck={false}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function OtpEmailForm({ email, emailError, isAnyLoading, isLoading, onEmailChange, onSwitchToPassword, onSubmit, t }: OtpEmailFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <EmailInput id="otp-email-input" value={email} onChange={onEmailChange} error={emailError} errorId="otp-email-error" disabled={isAnyLoading} t={t} />
      <Button type="submit" disabled={isAnyLoading || !email || !!emailError} className={cn(SUBMIT_BTN_CLASS, 'flex items-center justify-center gap-2')} asChild={false}>
        {isLoading === 'otp' ? <Loader size="sm" /> : <><Mail className="w-4 h-4" /><span>{t('auth.otp.sendCode')}</span></>}
      </Button>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Mail className="w-3 h-3" />{t('auth.otp.noPassword')}
        </span>
        <button type="button" onClick={onSwitchToPassword} className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
          {t('auth.magicLink.usePassword')}
        </button>
      </div>
    </form>
  );
}

export function OtpVerifyForm({ email, otpCode, otpCooldown, isAnyLoading, isLoading, onOtpChange, onSubmit, onResend, onChangeEmail, t }: OtpVerifyFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 rounded-neo border-2 bg-neo-navy-light text-white placeholder-gray-500 text-center text-2xl tracking-[0.5em] font-mono focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy transition-colors border-slate-600 focus:border-neo-cyan"
          disabled={isAnyLoading}
        />
      </div>
      <Button type="submit" disabled={isAnyLoading || otpCode.length !== 6} className={SUBMIT_BTN_CLASS} asChild={false}>
        {isLoading === 'otp-verify' ? <Loader size="sm" /> : t('auth.otp.verify')}
      </Button>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onChangeEmail} className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
          {t('auth.otp.changeEmail')}
        </button>
        <button type="button" onClick={onResend as unknown as React.MouseEventHandler} disabled={otpCooldown > 0} className="text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-40">
          {otpCooldown > 0 ? `${t('auth.otp.resend')} (${otpCooldown}s)` : t('auth.otp.resend')}
        </button>
      </div>
    </form>
  );
}

export function MagicLinkForm({ email, emailError, isAnyLoading, isLoading, onEmailChange, onSwitchToPassword, onSubmit, t }: MagicLinkFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <EmailInput id="magic-email-input" value={email} onChange={onEmailChange} error={emailError} errorId="magic-email-error" disabled={isAnyLoading} t={t} />
      <Button type="submit" disabled={isAnyLoading || !email || !!emailError} className={cn(SUBMIT_BTN_CLASS, 'flex items-center justify-center gap-2')} asChild={false}>
        {isLoading === 'magiclink' ? <Loader size="sm" /> : <><Wand2 className="w-4 h-4" /><span>{t('auth.magicLink.sendLink')}</span></>}
      </Button>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Wand2 className="w-3 h-3" />{t('auth.magicLink.noPassword')}
        </span>
        <button type="button" onClick={onSwitchToPassword} className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
          {t('auth.magicLink.usePassword')}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm({ email, emailError, password, passwordError, showPassword, authMode, isAnyLoading, isLoading, onEmailChange, onPasswordChange, onTogglePassword, onToggleAuthMode, onSwitchToMagicLink, onSubmit, t }: PasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <EmailInput id="pwd-email-input" value={email} onChange={onEmailChange} error={emailError} errorId="pwd-email-error" disabled={isAnyLoading} t={t} />
      <div>
        <label htmlFor="pwd-password-input" className="sr-only">{t('auth.inlineSignup.passwordPlaceholder')}</label>
        <div className="relative">
          <input
            id="pwd-password-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
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
            onClick={onTogglePassword}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-200 transition-colors rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
          >
            {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
        {passwordError && <p id="pwd-password-error" role="alert" className="mt-1 text-xs text-red-400">{passwordError}</p>}
      </div>
      <Button type="submit" disabled={isAnyLoading || !email || !password || !!emailError || !!passwordError} className={SUBMIT_BTN_CLASS} asChild={false}>
        {isLoading === 'email' ? <Loader size="sm" /> : authMode === 'signup' ? t('auth.inlineSignup.signUpButton') : t('auth.signIn')}
      </Button>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onToggleAuthMode} className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
          {authMode === 'signup' ? t('auth.alreadyHaveAccount') : t('auth.noAccount')}
        </button>
        <button type="button" onClick={onSwitchToMagicLink} className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
          {t('auth.magicLink.useMagicLink')}
        </button>
      </div>
    </form>
  );
}
