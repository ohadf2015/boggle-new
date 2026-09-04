'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink, Gift } from 'lucide-react';
import Link from 'next/link';
import { Loader } from '@/components/ui/Loader';

interface SubscriptionStatus {
  has_pro: boolean;
  tier: string;
  status: string;
  /** 'admin_grant' = complimentary Pro with a hard end date; anything else = the provider. */
  source?: string;
  portal_url: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  grant?: { id: string; expires_at: string; days: number; note: string | null; welcomed: boolean } | null;
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

  // A gifted plan has no renewal, no portal and no card on file — say so, or the
  // teacher reads "Next renewal" as a bill on its way.
  const isGift = subscription.has_pro && subscription.source === 'admin_grant';
  const endDate = subscription.grant?.expires_at ?? subscription.current_period_end;

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
          <div className="bg-neo-lime px-3 py-1 rounded-neo border-2 border-neo-black flex items-center gap-1.5">
            {isGift && <Gift className="w-4 h-4 text-neo-black" aria-hidden="true" />}
            <span className="font-bold text-neo-black text-sm">
              {isGift ? t('teacher.subscription.giftedBadge') : t('teacher.subscription.popular')}
            </span>
          </div>
        )}
      </div>

      {subscription.has_pro && endDate && (
        <div className="mb-4 p-3 bg-black/10 rounded-neo border-2 border-black">
          <p className="text-xs font-bold text-neo-black/60 mb-1">
            {isGift ? t('teacher.subscription.giftedUntil') : t('teacher.subscription.renewsOn')}
          </p>
          <p className="font-bold text-neo-black">
            {new Date(endDate).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {isGift && (
            <p className="text-xs font-bold text-neo-black/70 mt-2">
              {t('teacher.subscription.giftedNoCard')}
            </p>
          )}
          {!isGift && subscription.cancel_at_period_end && (
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
