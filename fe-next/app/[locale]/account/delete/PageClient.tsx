'use client';

import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Trash2, AlertTriangle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/ThemeContext';
import { signInWithMagicLink, signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Step = 'email' | 'check-email' | 'confirm' | 'deleted';

export default function DeleteAccountPageClient() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [step, setStep] = useState<Step>(user ? 'confirm' : 'email');
  const [email, setEmail] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Send magic link to verify identity
  const handleSendLink = useCallback(async () => {
    if (!email || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithMagicLink(email);
      if (result?.error) {
        setError(result.error.message || t('deleteAccountWeb.sendLinkError'));
        setIsLoading(false);
        return;
      }
      setStep('check-email');
    } catch {
      setError(t('deleteAccountWeb.sendLinkError'));
    }
    setIsLoading(false);
  }, [email, isLoading, t]);

  // Step 3: Delete account
  const handleDelete = useCallback(async () => {
    if (confirmText !== 'DELETE' || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('settings.deleteAccountError'));
        setIsLoading(false);
        return;
      }

      await signOut();
      setStep('deleted');
    } catch {
      setError(t('settings.deleteAccountError'));
      setIsLoading(false);
    }
  }, [confirmText, isLoading, t]);

  const cardClass = cn(
    'max-w-md mx-auto p-6 rounded-neo border-3',
    isDarkMode ? 'bg-neo-navy-light border-slate-600' : 'bg-white border-neo-black'
  );

  const inputClass = cn(
    'w-full px-4 py-3 rounded-neo border-3 text-sm min-h-[44px]',
    isDarkMode
      ? 'bg-neo-navy-elevated border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-gray-300 text-neo-black placeholder:text-gray-400'
  );

  return (
    <div className={cn('min-h-screen', isDarkMode ? 'bg-neo-navy' : 'bg-gray-50')}>
      <Header />
      <div className="px-4 py-8 pt-20">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardClass}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-red/50 bg-neo-red/10">
              <Trash2 className="w-6 h-6 text-neo-red" />
            </div>
            <div>
              <h1 className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('deleteAccountWeb.title')}
              </h1>
              <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('deleteAccountWeb.subtitle')}
              </p>
            </div>
          </div>

          {/* Step: Enter email */}
          {step === 'email' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Mail className={cn('w-5 h-5 shrink-0 mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
                <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {t('deleteAccountWeb.enterEmail')}
                </p>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('deleteAccountWeb.emailPlaceholder')}
                autoComplete="email"
                className={inputClass}
              />
              {error && <p className="text-neo-red text-sm font-medium">{error}</p>}
              <button
                onClick={handleSendLink}
                disabled={!email || isLoading}
                className={cn(
                  'w-full px-4 py-3 rounded-neo border-3 border-neo-red font-bold text-sm min-h-[44px] transition-colors',
                  email && !isLoading
                    ? 'bg-neo-red text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? t('deleteAccountWeb.sending') : t('deleteAccountWeb.sendLink')}
              </button>
            </div>
          )}

          {/* Step: Check email */}
          {step === 'check-email' && (
            <div className="space-y-4 text-center">
              <Mail className={cn('w-12 h-12 mx-auto', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
              <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {t('deleteAccountWeb.checkEmail')}
              </p>
              <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
                {t('deleteAccountWeb.checkEmailDescription')}
              </p>
            </div>
          )}

          {/* Step: Confirm deletion (user is authenticated) */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-neo-red shrink-0 mt-0.5" />
                <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {t('settings.deleteAccountConfirm')}
                </p>
              </div>
              <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {t('settings.deleteAccountTypeConfirm')}
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className={cn(inputClass, 'font-mono')}
              />
              {error && <p className="text-neo-red text-sm font-medium">{error}</p>}
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || isLoading}
                className={cn(
                  'w-full px-4 py-3 rounded-neo border-3 border-neo-red font-bold text-sm min-h-[44px] transition-colors',
                  confirmText === 'DELETE' && !isLoading
                    ? 'bg-neo-red text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? t('settings.deleteAccountDeleting') : t('settings.deleteAccountConfirmButton')}
              </button>
            </div>
          )}

          {/* Step: Account deleted */}
          {step === 'deleted' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {t('deleteAccountWeb.deleted')}
              </p>
              <Link
                href={`/${language}`}
                className={cn(
                  'inline-block px-6 py-3 rounded-neo border-3 border-neo-black font-bold text-sm min-h-[44px]',
                  isDarkMode ? 'bg-neo-navy-elevated text-white' : 'bg-white text-neo-black'
                )}
              >
                <ArrowLeft className="w-4 h-4 inline me-2" />
                {t('deleteAccountWeb.backToHome')}
              </Link>
            </div>
          )}
        </m.div>
      </div>
    </div>
  );
}
