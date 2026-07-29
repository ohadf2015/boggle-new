'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Mail, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';

/**
 * Unsubscribe Confirmation Page
 *
 * This page is shown after a user clicks the unsubscribe link in an email.
 * It displays a success or error message based on the query parameters.
 */
export default function UnsubscribePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Check for success or error in query params
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      setStatus('success');
    } else if (error) {
      setStatus('error');
    } else {
      // If no params, redirect to home
      setStatus('error');
    }
  }, [searchParams]);

  const handleBackToGame = () => {
    router.push(`/${language}`);
  };

  const handleResubscribe = () => {
    // Redirect to profile page where they can resubscribe
    router.push(`/${language}/profile`);
  };

  return (
    <div className="flex-1 flex flex-col bg-neo-navy text-neo-white items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-neo-navy-light/50 border-4 border-neo-black rounded-neo shadow-hard-lg p-8 text-center">
          {status === 'loading' ? (
            <PageLoader size="md" text={t('unsubscribe.processing')} />
          ) : status === 'success' ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-neo-lime border-4 border-neo-black rounded-full mb-6 text-neo-black">
                <CheckCircle className="w-10 h-10" />
              </div>

              <h1 className="text-2xl font-black text-neo-white mb-4">
                {t('unsubscribe.successTitle')}
              </h1>

              <p className="text-neo-white mb-6">
                {t('unsubscribe.successMessage') ||
                  "You won't receive any more daily challenge emails from us. We hope to see you in the game!"}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBackToGame}
                  className={cn(
                    'flex-1 px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
                    'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    'bg-neo-lime text-neo-black hover:bg-neo-lime/90'
                  )}
                >
                  <ArrowLeft className="me-2 rtl:rotate-180" />
                  {t('unsubscribe.backToGame')}
                </Button>

                <Button
                  onClick={handleResubscribe}
                  variant="outline"
                  className={cn(
                    'flex-1 px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
                    'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    'bg-neo-navy-elevated text-neo-white hover:bg-slate-600'
                  )}
                >
                  <Mail className="me-2" />
                  {t('unsubscribe.resubscribe')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-neo-red border-4 border-neo-black rounded-full mb-6">
                <XCircle className="w-10 h-10 text-neo-white" />
              </div>

              <h1 className="text-2xl font-black text-neo-white mb-4">
                {t('unsubscribe.errorTitle')}
              </h1>

              <p className="text-neo-white mb-6">
                {t('unsubscribe.errorMessage') ||
                  "We couldn't process your unsubscribe request. The link may have expired or already been used."}
              </p>

              <Button
                onClick={handleBackToGame}
                className={cn(
                  'w-full px-6 py-3 rounded-neo border-3 border-neo-black font-black uppercase tracking-wide transition-all',
                  'shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                  'bg-neo-cyan text-neo-black hover:bg-neo-cyan/90'
                )}
              >
                <ArrowLeft className="me-2 rtl:rotate-180" />
                {t('unsubscribe.backToGame')}
              </Button>
            </>
          )}
        </div>

        {/* Logo */}
        <div className="text-center mt-8">
          <h2 className="text-xl font-black">
            <span className="text-neo-lime">Lexi</span>
            <span className="text-neo-orange">Clash</span>
          </h2>
        </div>
      </m.div>
    </div>
  );
}
