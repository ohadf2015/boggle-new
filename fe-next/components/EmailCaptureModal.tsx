'use client';

import { useState, useEffect } from 'react';
import { Mail, Trophy, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  // Check if email subscription is enabled on the server
  useEffect(() => {
    const checkEnabled = async () => {
      try {
        const response = await fetch('/api/subscribe-email');
        const data = await response.json();
        setIsEnabled(data.enabled);
      } catch {
        // If check fails, assume disabled
        setIsEnabled(false);
      }
    };
    checkEnabled();
  }, []);

  useEffect(() => {
    // Don't show if not enabled or still checking
    if (isEnabled !== true) return;

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

      // Check if user has completed at least 1 game
      const gamesCompleted = parseInt(localStorage.getItem('games_completed_count') || '0');
      if (gamesCompleted < 1) return false;

      return true;
    };

    if (!checkShouldShow()) {
      return;
    }

    // Show modal after 5 seconds
    const timer = setTimeout(() => {
      setShowModal(true);
      // Increment show count
      const showCount = parseInt(localStorage.getItem('email_modal_show_count') || '0');
      localStorage.setItem('email_modal_show_count', (showCount + 1).toString());
    }, 5000);

    return () => clearTimeout(timer);
  }, [isEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('validation.invalidEmail') || 'Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      // Send to your email service endpoint
      const response = await fetch('/api/subscribe-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'post_game_modal',
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Subscription failed');
      }

      // Mark as subscribed
      localStorage.setItem('email_subscribed', 'true');
      localStorage.setItem('subscriber_email', email);

      // Track conversion
      socialEvents.completeRegistration(email);

      setSubmitted(true);

      // Close modal after 3 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 3000);
    } catch (err) {
      setError(t('error.subscriptionFailed') || 'Subscription failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
              ? t('email.successTitle') || "You're all set!"
              : t('email.title') || 'Get Daily Challenges!'}
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
                {t('email.successTitle') || "You're all set!"}
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
                  {t('email.title') || 'Get Daily Challenges!'}
                </h3>
                {/* Compact benefits inline */}
                <div className="flex justify-center gap-4 text-neo-cream/80 text-sm">
                  <span>🔥 {t('email.benefitShort1') || 'Streak reminders'}</span>
                  <span>🎯 {t('email.benefitShort2') || 'Daily puzzles'}</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('email.placeholder') || 'your@email.com'}
                    className="w-full px-4 py-3 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm placeholder:text-neo-gray placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                  {error && (
                    <p className="mt-2 text-neo-red text-sm font-bold">{error}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-neo-lime text-neo-black font-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? t('email.submitting') || 'Subscribing...'
                      : t('email.submit') || 'Subscribe'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-4 py-3 bg-neo-gray text-neo-white font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-100 uppercase"
                  >
                    {t('common.skip') || 'Skip'}
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
