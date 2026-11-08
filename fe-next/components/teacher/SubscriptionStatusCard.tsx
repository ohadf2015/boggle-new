'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink, Gift } from 'lucide-react';
import Link from 'next/link';
import { Loader } from '@/components/ui/Loader';
import { NB_BLOCK, NB_LINK, NB_PANEL, NB_PRIMARY, NB_SMALL, NB_STICKER } from './nb/nbStyles';

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

/** `usage` is the free plan's one-line usage, like "2 of 3 free classes used". */
export default function SubscriptionStatusCard({ usage }: { usage?: string } = {}) {
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
      <div className={cn(NB_PANEL, 'flex min-h-32 items-center justify-center p-6')}>
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

  const dateLabel = endDate
    ? new Date(endDate).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <section
      data-testid="subscription-card"
      data-plan={subscription.has_pro ? 'pro' : 'free'}
      aria-labelledby="subscription-card-title"
      className={cn(NB_PANEL, subscription.has_pro ? NB_BLOCK.cyan : NB_BLOCK.navy, 'flex flex-col gap-4 p-5 sm:p-6')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="subscription-card-title" className="font-neo-display text-2xl font-black leading-tight">
            {subscription.has_pro ? t('teacher.subscription.proPlanName') : t('teacher.subscription.freePlanName')}
          </h2>
          <p className={cn('mt-0.5 font-neo-body text-sm font-bold', subscription.has_pro ? 'text-neo-black/75' : 'text-neo-cream/80')}>
            {subscription.has_pro ? t('teacher.subscription.unlimitedAccess') : t('teacher.subscription.freeForever')}
          </p>
          {!subscription.has_pro && usage ? (
            <p data-testid="subscription-usage" className="mt-2 font-neo-body text-sm font-semibold text-neo-cream/80">{usage}</p>
          ) : null}
        </div>
        {subscription.has_pro ? (
          <span className={cn(NB_STICKER, NB_BLOCK.lime)}>
            {isGift && <Gift className="size-3.5" aria-hidden="true" />}
            {isGift ? t('teacher.subscription.giftedBadge') : t('teacher.subscription.popular')}
          </span>
        ) : null}
      </div>

      {subscription.has_pro && dateLabel && (
        <div className="rounded-neo-lg border-2 border-neo-black bg-neo-white/50 px-3 py-2">
          <p className="font-neo-body text-xs font-bold text-neo-black/70">
            {isGift ? t('teacher.subscription.giftedUntil') : t('teacher.subscription.renewsOn')}
          </p>
          <p className="font-neo-display text-lg font-black text-neo-black">{dateLabel}</p>
          {isGift && <p className="mt-1 font-neo-body text-xs font-bold text-neo-black/75">{t('teacher.subscription.giftedNoCard')}</p>}
          {!isGift && subscription.cancel_at_period_end && (
            <p className="mt-1 font-neo-body text-xs font-bold text-neo-black/75">{t('teacher.subscription.canceledAt')}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {!subscription.has_pro && (
          <Link href={`/${language}/teacher/upgrade`} data-testid="subscription-upgrade" className={cn(NB_PRIMARY, 'w-full sm:w-auto sm:px-8')}>
            <Zap className="size-5" aria-hidden="true" />
            {t('teacher.subscription.upgradeNow')}
          </Link>
        )}

        {subscription.has_pro && subscription.portal_url && (
          <a href={subscription.portal_url} target="_blank" rel="noopener noreferrer" className={cn(NB_SMALL, 'bg-neo-black text-neo-white')}>
            <ExternalLink className="size-4" aria-hidden="true" />
            {t('teacher.subscription.manageSubscription')}
          </a>
        )}

        <Link
          href={`/${language}/legal/refund`}
          className={cn(NB_LINK, subscription.has_pro && 'text-neo-black/80 hover:text-neo-black')}
        >
          {t('legal.refundPolicy')}
        </Link>
      </div>
    </section>
  );
}
