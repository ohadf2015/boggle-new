'use client';

import { useId, useState, type FormEvent } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';
import { readCampaignUtms } from '@/lib/analytics/landerCta';

export interface WaitlistCopy {
  emailLabel: string;
  submit: string;
  success: string;
  error: string;
  consent: string;
}

interface WaitlistFormProps {
  /** Must contain "waitlist" so campaign sends skip these rows. */
  source: `${string}waitlist${string}`;
  language: string;
  copy: WaitlistCopy;
  displayClass?: string;
  bodyClass?: string;
}

type Status = 'idle' | 'sending' | 'done' | 'error';

export function WaitlistForm({ source, language, copy, displayClass = 'font-neo-display font-bold', bodyClass = 'font-neo-body' }: WaitlistFormProps) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source,
          language,
          timestamp: Date.now(),
          ...readCampaignUtms(window.location.search),
        }),
      });
      if (!res.ok) throw new Error(`subscribe ${res.status}`);
      posthog.capture('waitlist_submitted', { source, language, path: window.location.pathname });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <p
        role="status"
        className={`rounded-neo border-neo-thick border-neo-black bg-neo-lime px-5 py-4 text-lg text-neo-black shadow-hard ${displayClass}`}
      >
        {copy.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor={inputId} className={`text-lg leading-snug text-neo-white sm:text-xl ${displayClass}`}>
        {copy.emailLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-neo border-neo-thick border-neo-black bg-neo-cream px-4 text-lg text-neo-black shadow-hard focus:outline-hidden focus:ring-4 focus:ring-neo-cyan"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className={`min-h-14 rounded-neo border-neo-thick border-neo-black bg-neo-pink px-7 text-lg text-neo-black shadow-hard-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-60 ${displayClass}`}
        >
          {copy.submit}
        </button>
      </div>
      <p className={`text-sm text-neo-white/80 ${bodyClass}`}>{copy.consent}</p>
      {status === 'error' && (
        <p role="alert" className={`font-bold text-neo-pink ${bodyClass}`}>
          {copy.error}
        </p>
      )}
    </form>
  );
}
