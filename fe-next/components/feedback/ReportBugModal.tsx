'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, Send, ChevronDown, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * In-app "Report a Bug" modal. Auto-captures the page, browser, locale, viewport
 * and (if signed in) user id so reports are actionable, then POSTs to
 * /api/feedback which fans out to Supabase + Telegram + email. The auto-captured
 * details are shown in a disclosure so the user knows exactly what's sent.
 */
export function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const { t, dir, language } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();

  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [showDetails, setShowDetails] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= MIN_MESSAGE_LENGTH && status !== 'submitting';

  const page = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const browser = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const handleClose = useCallback(() => {
    setMessage('');
    setStatus('idle');
    setShowDetails(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (trimmed.length < MIN_MESSAGE_LENGTH) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          page,
          userAgent: browser,
          userId: user?.id ?? null,
          locale: language,
          viewport:
            typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '',
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [trimmed, page, browser, user, language]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent noDescription className="max-w-md" dir={dir}>
        <DialogHeader className="bg-linear-to-r from-neo-pink via-neo-pink to-neo-purple text-neo-white p-4 sm:p-5 relative overflow-hidden">
          <Bug className="absolute top-2 right-3 rtl:right-auto rtl:left-3 w-5 h-5 text-neo-white/30" aria-hidden="true" />
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            {t('bugReport.title')}
          </DialogTitle>
          <p className="text-sm text-neo-white/80 mt-1">{t('bugReport.description')}</p>
        </DialogHeader>

        {status === 'success' ? (
          <DialogBody className="px-4 sm:px-5 py-8 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-neo-lime mb-3" aria-hidden="true" />
            <p className="text-base font-bold text-neo-white">{t('bugReport.success')}</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 px-6 py-2.5 bg-neo-lime text-neo-black font-black uppercase text-sm border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
            >
              {t('bugReport.close')}
            </button>
          </DialogBody>
        ) : (
          <>
            <DialogBody className="px-4 sm:px-5 py-4 space-y-3">
              <label htmlFor="bug-report-message" className="block text-sm font-bold text-neo-white">
                {t('bugReport.whatHappened')}
              </label>
              <textarea
                id="bug-report-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder={t('bugReport.placeholder')}
                rows={5}
                dir={dir}
                className="w-full p-3 bg-neo-navy-light text-neo-white border-2 border-neo-black/60 rounded-neo resize-none focus:outline-none focus:border-neo-pink placeholder:text-neo-white/40"
              />

              {status === 'error' && (
                <p role="alert" className="text-sm font-bold text-neo-red">
                  {t('bugReport.error')}
                </p>
              )}

              {/* Transparency: show what we auto-attach */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="flex items-center gap-1 text-xs text-neo-white/60 hover:text-neo-white"
                >
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 transition-transform', showDetails && 'rotate-180')}
                    aria-hidden="true"
                  />
                  {t('bugReport.sessionInfo')}
                </button>
                {showDetails && (
                  <dl className="mt-2 text-xs text-neo-white/70 space-y-1 bg-neo-navy/60 rounded-neo p-2.5 border border-neo-black/40">
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.currentPage')}:</dt>
                      <dd className="truncate">{page || '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.userId')}:</dt>
                      <dd className="truncate">{user?.id ?? '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.browserInfo')}:</dt>
                      <dd className="truncate">{browser || '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="px-4 sm:px-5 pb-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-transparent text-neo-white/70 font-bold uppercase text-sm hover:text-neo-white"
              >
                {t('bugReport.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-neo-pink text-neo-white font-black uppercase text-sm border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                {status === 'submitting' ? t('bugReport.submitting') : t('bugReport.submit')}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportBugModal;
