'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Trophy, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useConsentDecided } from '@/hooks/useConsentDecided';
import { socialEvents } from './SocialMediaPixels';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';

/**
 * Email Capture Modal for Re-engagement
 *
 * Shows after user completes their first game (if not dismissed or subscribed).
 * Offers daily challenges and streak reminders via email.
 *
 * Trigger conditions:
 * 1. User has completed at least 1 game
 * 2. User hasn't dismissed modal in last 30 days
 * 3. User hasn't already subscribed
 * 4. Modal hasn't been shown more than 3 times total
 */
export function EmailCaptureModal() {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  // Hold the modal until the cookie-consent decision is resolved — otherwise it opens
  // behind the z-110 consent banner (this modal is z-90) and is revealed on dismiss.
  const consentDecided = useConsentDecided();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Check if email subscription is enabled on the server
  const { data: isEnabled = null } = useQuery<boolean | null>({
    queryKey: ['email-subscription-enabled'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/subscribe-email');
        const data = await response.json();
        return data.enabled ?? false;
      } catch {
        return false;
      }
    },
    staleTime: 10 * 60_000,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch('/api/subscribe-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          source: 'post_game_modal',
          timestamp: Date.now(),
        }),
      });
      if (!response.ok) throw new Error('Subscription failed');
    },
  });

  useEffect(() => {
    // Don't show if not enabled or still checking
    if (isEnabled !== true) return;
    // CrazyGames embed: never show email capture (platform forbids unsolicited capture)
    if (isOnCrazyGamesPlatform) return;
    // Wait for the cookie-consent decision before competing for the screen.
    if (!consentDecided) return;

    // Check if modal should be shown
    const checkShouldShow = () => {
      // Check if user has already subscribed
      const hasSubscribed = localStorage.getItem('email_subscribed') === 'true';
      if (hasSubscribed) return false;

      // Check if dismissed recently (30 days)
      const dismissedUntil = localStorage.getItem('email_modal_dismissed_until');
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return false;

      // Check show count (max 3 times)
      const showCount = parseInt(localStorage.getItem('email_modal_show_count') || '0');
      if (showCount >= 3) return false;

      // Require at least 5 games before showing (avoid "intrusive popup" penalty)
      const gamesCompleted = parseInt(localStorage.getItem('games_completed_count') || '0');
      if (gamesCompleted < 5) return false;

      // Require at least 7 days since first visit
      const firstVisit = localStorage.getItem('first_visit_timestamp');
      if (!firstVisit) {
        localStorage.setItem('first_visit_timestamp', Date.now().toString());
        return false;
      }
      const daysSinceFirstVisit = (Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24);
      if (daysSinceFirstVisit < 7) return false;

      return true;
    };

    if (!checkShouldShow()) {
      return;
    }

    // Show modal after 10 seconds (less intrusive than 5s)
    const timer = setTimeout(() => {
      setShowModal(true);
      // Increment show count
      const showCount = parseInt(localStorage.getItem('email_modal_show_count') || '0');
      localStorage.setItem('email_modal_show_count', (showCount + 1).toString());
    }, 10000);

    return () => clearTimeout(timer);
  }, [isEnabled, isOnCrazyGamesPlatform, consentDecided]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('validation.invalidEmail'));
      return;
    }

    subscribeMutation.mutate(email, {
      onSuccess: () => {
        localStorage.setItem('email_subscribed', 'true');
        localStorage.setItem('subscriber_email', email);
        socialEvents.completeRegistration(email);
        setSubmitted(true);
        setTimeout(() => { setShowModal(false); }, 3000);
      },
      onError: () => {
        setError(t('error.subscriptionFailed'));
      },
    });
  };

  const handleDismiss = () => {
    setShowModal(false);
    // Don't show again for 30 days
    const dismissedUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('email_modal_dismissed_until', dismissedUntil.toString());
  };

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent
        noDescription
        className="bg-neo-navy border-4 border-neo-black max-w-md"
      >
        <DialogHeader
          variant="gradient"
          customBg="bg-neo-navy"
          className="border-b-0 text-neo-white"
        >
          <DialogTitle className="sr-only">
            {submitted
              ? t('email.successTitle')
              : t('email.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="text-neo-white">
          {submitted ? (
            /* Success State */
            <div className="text-center">
              <div className="inline-block p-4 bg-neo-lime text-neo-black border-3 border-neo-black rounded-full mb-4">
                <Mail size={48} className="text-neo-black" />
              </div>
              <h3 className="font-black text-neo-cream text-2xl mb-2">
                {t('email.successTitle')}
              </h3>
              <p className="text-neo-cream opacity-90">
                {t('email.successMessage') ||
                  "We'll send you daily challenges and streak reminders. Check your inbox!"}
              </p>
            </div>
          ) : (
            /* Subscription Form */
            <>
              <div className="text-center mb-6">
                <div className="inline-flex gap-2 mb-4">
                  <div className="p-3 bg-neo-purple text-neo-white border-3 border-neo-black rounded-neo">
                    <Trophy size={32} className="text-neo-white" />
                  </div>
                  <div className="p-3 bg-neo-cyan text-neo-black border-3 border-neo-black rounded-neo">
                    <Calendar size={32} className="text-neo-black" />
                  </div>
                </div>
                <h3 className="font-black text-neo-cream text-2xl md:text-3xl mb-2">
                  {t('email.title')}
                </h3>
                {/* Compact benefits inline */}
                <div className="flex justify-center gap-4 text-neo-cream/80 text-sm">
                  <span>🔥 {t('email.benefitShort1')}</span>
                  <span>🎯 {t('email.benefitShort2')}</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="capture-email-input" className="sr-only">{t('email.placeholder')}</label>
                  <input
                    id="capture-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('email.placeholder')}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'capture-email-error' : undefined}
                    className="w-full px-4 py-3 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm placeholder:text-neo-gray placeholder:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 transition-all"
                    required
                    disabled={subscribeMutation.isPending}
                  />
                  {error && (
                    <p id="capture-email-error" role="alert" className="mt-2 text-neo-red text-sm font-bold">{error}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={subscribeMutation.isPending}
                    className="flex-1 px-6 py-3 bg-neo-lime text-neo-black font-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subscribeMutation.isPending
                      ? t('email.submitting')
                      : t('email.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-4 py-3 bg-neo-gray text-neo-white font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase"
                  >
                    {t('common.skip')}
                  </button>
                </div>

                <p className="text-neo-cream text-xs opacity-70 text-center">
                  {t('email.privacy') ||
                    "We respect your privacy. Unsubscribe anytime. No spam, we promise."}
                </p>
              </form>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default EmailCaptureModal;
