'use client';

import { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface DeleteAccountSectionProps {
  isDarkMode: boolean;
}

export default function DeleteAccountSection({ isDarkMode }: DeleteAccountSectionProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    if (confirmText !== 'DELETE' || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('settings.deleteAccountError'));
        setIsDeleting(false);
        return;
      }

      // Sign out from all sessions and redirect
      await signOut();
      router.push(`/${language}`);
    } catch {
      setError(t('settings.deleteAccountError'));
      setIsDeleting(false);
    }
  }, [confirmText, isDeleting, t, language, router]);

  if (!user) return null;

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h2 className={cn(
        'text-sm font-black uppercase mb-3 flex items-center gap-2',
        'text-neo-red'
      )}>
        <AlertTriangle className="w-4 h-4" />
        {t('settings.dangerZone')}
      </h2>

      <div className={cn(
        'p-4 rounded-neo border-3 border-neo-red/50',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center border-2 border-neo-red/50 bg-neo-red/10">
              <Trash2 className="w-5 h-5 text-neo-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('settings.deleteAccount')}
              </p>
              <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('settings.deleteAccountDescription')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowConfirm(true); setError(null); setConfirmText(''); }}
            className={cn(
              'px-4 py-2 rounded-neo border-3 border-neo-red font-bold text-sm',
              'bg-neo-red/10 text-neo-red hover:bg-neo-red hover:text-white transition-colors',
              'min-h-[44px]'
            )}
          >
            {t('settings.deleteAccountButton')}
          </button>
        </div>

        {/* Confirmation modal inline */}
        <AnimatePresence>
          {showConfirm && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'mt-4 pt-4 border-t',
                isDarkMode ? 'border-slate-700' : 'border-gray-200'
              )}>
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-neo-red shrink-0 mt-0.5" />
                  <p className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                    {t('settings.deleteAccountConfirm')}
                  </p>
                </div>

                <label htmlFor="delete-confirm" className={cn('text-xs mb-2 block', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {t('settings.deleteAccountTypeConfirm')}
                </label>

                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'delete-error' : undefined}
                  className={cn(
                    'w-full px-3 py-2 rounded-neo border-3 font-mono text-sm mb-3',
                    isDarkMode
                      ? 'bg-neo-navy-elevated border-slate-600 text-white placeholder:text-slate-500'
                      : 'bg-white border-gray-300 text-neo-black placeholder:text-gray-400'
                  )}
                />

                {error && (
                  <p id="delete-error" className="text-neo-red text-sm mb-3 font-medium" role="alert">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={confirmText !== 'DELETE' || isDeleting}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-neo border-3 border-neo-red font-bold text-sm min-h-[44px] transition-colors',
                      confirmText === 'DELETE' && !isDeleting
                        ? 'bg-neo-red text-white hover:bg-red-600'
                        : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    )}
                  >
                    {isDeleting ? t('settings.deleteAccountDeleting') : t('settings.deleteAccountConfirmButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className={cn(
                      'px-4 py-2 rounded-neo border-3 border-neo-black font-bold text-sm min-h-[44px]',
                      isDarkMode ? 'bg-neo-navy-elevated text-white' : 'bg-white text-neo-black'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.section>
  );
}
