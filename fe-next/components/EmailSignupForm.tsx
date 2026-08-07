'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { socialEvents } from './SocialMediaPixels';

interface EmailSignupFormProps {
  /** Controls placement spacing. Defaults to the footer's vertical rhythm. */
  className?: string;
}

/**
 * EmailSignupForm — inline email-capture form for the sitewide footer.
 *
 * Unlike the retired post-game EmailCaptureModal (which popped over the game
 * screen and was removed in #787), this is a passive, in-flow signup placed
 * above the footer's bottom bar. It requires no scroll-interaction timing, no
 * game-completion gates, and no localStorage bookkeeping — it's simply present
 * wherever the marketing footer renders (home + all SEO landing pages), giving
 * the site's ~300/day organic visitors a frictionless re-engagement surface.
 *
 * Posting to the existing `/api/subscribe-email` route (same backend the
 * retired modal used): stores the address in Supabase `email_subscribers` and
 * optionally fans out to Mailchimp/SendGrid when those env vars are set.
 * `source: 'footer_newsletter'` lets the backend distinguish footer signups
 * from past in-game captures.
 */
export function EmailSignupForm({ className }: EmailSignupFormProps) {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  // CrazyGames embed forbids unsolicited email capture on its platform; the
  // footer is still shown there as a minimal legal strip anyway, so never
  // render the signup form on that embed.
  if (isOnCrazyGamesPlatform) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('validation.invalidEmail'));
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/subscribe-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'footer_newsletter',
          timestamp: Date.now(),
        }),
      });
      if (!response.ok) throw new Error('Subscription failed');
      socialEvents.completeRegistration(email);
      setSubmitted(true);
    } catch {
      setError(t('error.subscriptionFailed'));
    } finally {
      setPending(false);
    }
  };

  if (submitted) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm">
            <Mail size={20} />
          </span>
          <div>
            <p className="font-black text-neo-white">{t('email.successTitle')}</p>
            <p className="text-sm text-neo-white/80">{t('email.successMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <form
        onSubmit={handleSubmit}
        aria-label={t('newsletter.title')}
        className="flex flex-col sm:flex-row gap-3"
        noValidate
      >
        <label htmlFor="footer-newsletter-email" className="sr-only">
          {t('email.placeholder')}
        </label>
        <input
          id="footer-newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email.placeholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'footer-newsletter-error' : undefined}
          className="w-full flex-1 px-4 py-3 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm placeholder:text-neo-gray placeholder:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 transition-all"
          required
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 px-6 py-3 bg-accent text-accent-foreground font-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? t('email.submitting') : t('email.submit')}
        </button>
      </form>
      {error ? (
        <p
          id="footer-newsletter-error"
          role="alert"
          className="mt-2 text-sm font-bold text-neo-red"
        >
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-neo-white/60">{t('email.privacy')}</p>
      )}
    </div>
  );
}

export default EmailSignupForm;