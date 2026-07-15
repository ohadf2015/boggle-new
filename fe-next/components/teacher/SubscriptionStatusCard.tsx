'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Loader } from '@/components/ui/Loader';

interface SubscriptionStatus {
  has_pro: boolean;
  tier: string;
  status: string;
  portal_url: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default function SubscriptionStatusCard() {
  const { t, language } = useLanguage();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/subscription/status');
        if (!response.ok) {
          setError('Failed to load subscription status');
          return;
        }
        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        setError('Failed to load subscription status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center min-h-32">
        <Loader size="sm" text={t('common.loading')} />
      </div>
    );
  }

  if (error || !subscription) {
    return null;
  }

  return (
    <div
      className={cn(
        'p-6 border-3 border-neo-black rounded-neo shadow-hard',
        subscription.has_pro ? 'bg-neo-cyan' : 'bg-neo-cream'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className={cn(
            'text-2xl font-neo-display font-black mb-1',
            subscription.has_pro ? 'text-neo-black' : 'text-neo-black'
          )}>
            {subscription.has_pro ? t('teacher.subscription.proPlanName') : t('teacher.subscription.freePlanName')}
          </h2>
          <p className={cn(
            'font-bold',
            subscription.has_pro ? 'text-neo-black/70' : 'text-neo-black/60'
          )}>
            {subscription.has_pro ? t('teacher.subscription.unlimitedAccess') : t('teacher.subscription.freeForever')}
          </p>
        </div>
        {subscription.has_pro && (
          <div className="bg-neo-lime px-3 py-1 rounded-neo border-2 border-neo-black">
            <span className="font-bold text-neo-black text-sm">
              {t('teacher.subscription.popular')}
            </span>
          </div>
        )}
      </div>

      {subscription.has_pro && subscription.current_period_end && (
        <div className="mb-4 p-3 bg-black/10 rounded-neo border-2 border-black">
          <p className="text-xs font-bold text-neo-black/60 mb-1">
            {t('teacher.subscription.renewsOn')}
          </p>
          <p className="font-bold text-neo-black">
            {new Date(subscription.current_period_end).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {subscription.cancel_at_period_end && (
            <p className="text-xs font-bold text-neo-black/70 mt-2">
              {t('teacher.subscription.canceledAt')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!subscription.has_pro && (
          <Link href={`/${language}/teacher/upgrade`} className="contents">
            <Button className="bg-neo-black text-white font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              {t('teacher.subscription.upgradeNow')}
            </Button>
          </Link>
        )}

        {subscription.has_pro && subscription.portal_url && (
          <a href={subscription.portal_url} target="_blank" rel="noopener noreferrer" className="contents">
            <Button className="bg-neo-black text-white font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {t('teacher.subscription.manageSubscription')}
            </Button>
          </a>
        )}

        <Link href={`/${language}/legal/refund`} className="contents">
          <Button
            variant="outline"
            className={cn(
              'font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all',
              subscription.has_pro
                ? 'bg-black text-white hover:bg-black/80'
                : 'bg-neo-cream text-neo-black hover:bg-neo-cream/80'
            )}
          >
            {t('legal.refundPolicy')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
