'use client';
import { useState } from 'react';
import { MailCheck, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resendEmailVerification } from '@/lib/supabase';

const INBOXES = [
  { id: 'gmail', href: 'https://mail.google.com/mail/u/0/#search/LexiClash+in%3Aanywhere', label: 'Gmail' },
  { id: 'outlook', href: 'https://outlook.live.com/mail/0/', label: 'Outlook' },
] as const;

type ResendResult = { error: { message: string } | null | undefined };

export function TeacherCheckEmail({
  email,
  onChangeEmail,
  onResend: resendFn = resendEmailVerification,
}: {
  email: string;
  onChangeEmail: () => void;
  /** Magic-link signups re-send the link, not a signup confirmation. */
  onResend?: (email: string) => Promise<ResendResult>;
}) {
  const { t } = useLanguage();
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onResend = async () => {
    if (resend === 'sending') return;
    setResend('sending');
    const { error } = await resendFn(email);
    setResend(error ? 'error' : 'sent');
  };

  return (
    <div className="text-neo-white">
      <div role="status" className="rounded-neo border-3 border-neo-black bg-neo-lime p-4 text-neo-navy shadow-hard">
        <div className="flex items-center gap-2">
          <MailCheck className="size-6 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          <h3 className="font-neo-display text-lg font-black leading-tight">{t('eg2Land.checkEmail.title')}</h3>
        </div>
        <p className="mt-2 text-sm font-semibold">{t('eg2Land.checkEmail.sentTo')}</p>
        <p dir="ltr" className="mt-1 break-all font-mono text-base font-black">{email}</p>
      </div>

      <p className="mt-4 text-sm text-neo-white/85">{t('eg2Land.checkEmail.next')}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {INBOXES.map((box) => (
          <a
            key={box.id}
            href={box.href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`teacher-check-email-${box.id}`}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream/60 bg-neo-navy-light px-3 font-neo-display text-sm font-black text-neo-white shadow-hard-sm transition-[box-shadow] hover:shadow-hard focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            {t('eg2Land.checkEmail.open', undefined, { inbox: box.label })}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>

      <p className="mt-4 text-xs text-neo-white/65">{t('eg2Land.checkEmail.spam')}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold">
        <button
          type="button"
          data-testid="teacher-check-email-resend"
          onClick={onResend}
          disabled={resend === 'sending' || resend === 'sent'}
          className="min-h-11 text-neo-cyan underline decoration-2 underline-offset-4 disabled:no-underline disabled:opacity-80"
        >
          {resend === 'sent'
            ? t('eg2Land.checkEmail.resent')
            : resend === 'sending'
              ? t('eg2Land.checkEmail.sending')
              : t('eg2Land.checkEmail.resend')}
        </button>
        <button
          type="button"
          data-testid="teacher-check-email-change"
          onClick={onChangeEmail}
          className="min-h-11 text-neo-white/80 underline decoration-2 underline-offset-4 hover:text-neo-white"
        >
          {t('eg2Land.checkEmail.change')}
        </button>
      </div>
      {resend === 'error' && (
        <p role="alert" className="mt-2 text-sm font-semibold text-neo-red">
          {t('eg2Land.checkEmail.resendError')}
        </p>
      )}
    </div>
  );
}

export default TeacherCheckEmail;
