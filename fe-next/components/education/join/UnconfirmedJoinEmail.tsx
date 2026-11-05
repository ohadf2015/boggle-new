'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resendEmailVerification } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/client';
import { correctionDecision } from '@/lib/education/unconfirmedJoinEmail';

const K = 'education.student.join';

type Status = 'idle' | 'sending' | 'resent' | 'corrected' | 'not_a_typo' | 'taken' | 'invalid' | 'error';

/**
 * Invite-code join recovery. Guest join stays one tap; this is the door for
 * the student whose school email was typo'd and never confirmed. Resend needs
 * no session. Correcting a logged-out account goes through the server, which
 * only rewrites an unconfirmed address within two edits.
 */
export function UnconfirmedJoinEmail({
  joinCode,
  signedInEmail,
}: {
  joinCode: string;
  /** Set when this browser already has an unconfirmed email session. */
  signedInEmail?: string | null;
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(Boolean(signedInEmail));
  const [email, setEmail] = useState(signedInEmail ?? '');
  const [nextEmail, setNextEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const rememberCode = () => {
    try {
      if (joinCode) sessionStorage.setItem('joinClassroomReturnCode', joinCode);
    } catch {
      /* a private-mode throw must not block the resend */
    }
  };

  const onResend = async () => {
    if (status === 'sending' || !email.trim()) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');
    rememberCode();
    try {
      const { error } = await resendEmailVerification(email.trim());
      setStatus(error ? 'error' : 'resent');
    } catch {
      setStatus('error');
    }
  };

  const onCorrect = async () => {
    const decision = correctionDecision(email, nextEmail);
    if (decision === 'invalid' || decision === 'same') {
      setStatus('invalid');
      return;
    }
    if (decision === 'not_a_typo') {
      setStatus('not_a_typo');
      return;
    }
    setStatus('sending');
    rememberCode();
    try {
      if (signedInEmail && email.trim().toLowerCase() === signedInEmail.toLowerCase()) {
        const own = await createClient().auth.updateUser({ email: nextEmail.trim() });
        if (!own.error) {
          setStatus('corrected');
          return;
        }
      }
      const res = await fetch('/api/education/classroom/join/recover-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nextEmail: nextEmail.trim(),
          locale: language,
          joinCode,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      if (res.ok) setStatus('corrected');
      else if (body.code === 'NOT_A_TYPO') setStatus('not_a_typo');
      else if (body.code === 'TAKEN') setStatus('taken');
      else if (body.code === 'INVALID') setStatus('invalid');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        data-testid="join-unconfirmed-open"
        onClick={() => setOpen(true)}
        className="mt-4 min-h-11 text-sm font-bold text-neo-cyan underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        {t(`${K}.unconfirmed.open`, 'Confirmation email never arrived?')}
      </button>
    );
  }

  const note =
    status === 'resent' ? t(`${K}.unconfirmed.resent`, 'If that address is waiting, we sent another link.')
    : status === 'corrected' ? t(`${K}.unconfirmed.corrected`, 'Check the corrected address, confirm, then come back to this code.')
    : status === 'not_a_typo' ? t(`${K}.unconfirmed.notATypo`, 'That is more than a small typo. Change one or two characters, or sign up again.')
    : status === 'taken' ? t(`${K}.unconfirmed.taken`, 'That address already has an account. Sign in with it.')
    : status === 'invalid' ? t(`${K}.unconfirmed.invalid`, 'Enter a real email address.')
    : status === 'error' ? t(`${K}.unconfirmed.error`, 'Could not update that address. Try again in a minute.')
    : null;

  return (
    <div data-testid="join-unconfirmed-panel" className="mt-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 text-neo-white shadow-hard-sm">
      <h2 className="font-neo-display text-base font-black">{t(`${K}.unconfirmed.title`, 'Fix the email, then join')}</h2>
      <p className="mt-1 text-sm text-neo-white/80">
        {signedInEmail
          ? t(`${K}.unconfirmed.signedIn`, 'This account is not confirmed yet. You can still join, and you should fix the address so you can sign in next time.')
          : t(`${K}.unconfirmed.body`, 'A typo sends the confirmation nowhere. Resend it, or correct one or two characters.')}
      </p>
      <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-neo-white/70" htmlFor="join-unconfirmed-email">
        {t(`${K}.unconfirmed.emailLabel`, 'Email you signed up with')}
      </label>
      <input
        id="join-unconfirmed-email"
        type="email"
        autoComplete="email"
        dir="ltr"
        value={email}
        readOnly={Boolean(signedInEmail)}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-2 font-mono text-sm text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      />
      <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-neo-white/70" htmlFor="join-unconfirmed-next">
        {t(`${K}.unconfirmed.nextLabel`, 'Corrected email')}
      </label>
      <input
        id="join-unconfirmed-next"
        type="email"
        autoComplete="email"
        dir="ltr"
        value={nextEmail}
        onChange={(e) => setNextEmail(e.target.value)}
        className="mt-1 w-full rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-2 font-mono text-sm text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="join-unconfirmed-resend"
          disabled={status === 'sending'}
          onClick={onResend}
          className="min-h-11 rounded-neo border-3 border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm disabled:opacity-60"
        >
          {status === 'sending'
            ? t(`${K}.unconfirmed.resending`, 'Sending…')
            : t(`${K}.unconfirmed.resend`, 'Resend confirmation')}
        </button>
        <button
          type="button"
          data-testid="join-unconfirmed-correct"
          disabled={status === 'sending'}
          onClick={onCorrect}
          className="min-h-11 rounded-neo border-2 border-neo-cream/50 px-3 font-neo-display text-sm font-bold text-neo-white disabled:opacity-60"
        >
          {t(`${K}.unconfirmed.correct`, 'Send to the corrected address')}
        </button>
      </div>
      {note && (
        <p role="status" className="mt-2 text-sm font-semibold text-neo-cyan">
          {note}
        </p>
      )}
    </div>
  );
}
