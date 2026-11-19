'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_LINK, NB_SMALL } from '@/components/teacher/nb/nbStyles';
import { proPlanStatusLine } from '@/components/teacher/pro/proPlanStatus';

const ROW = 'flex flex-col gap-3 border-t-2 border-neo-cream/15 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6';

/** `usage` is the free plan's one line, like "2 of 3 free classes used". */
export function ProfilePlanRow({ usage }: { usage?: string }) {
  const { t, language } = useLanguage();
  const pro = useTeacherPro();
  const [nowMs] = useState(() => Date.now());

  if (pro.loading) {
    return (
      <div data-testid="subscription-card" className={ROW}>
        <span aria-hidden="true" className="h-7 w-40 animate-pulse rounded bg-neo-cream/15 motion-reduce:animate-none" />
      </div>
    );
  }

  const gifted = pro.hasPro && pro.source === 'admin_grant';
  const status = proPlanStatusLine({
    t,
    language,
    nowMs,
    status: pro.status,
    source: pro.source,
    trialExpires: pro.trialExpires,
    periodEnd: pro.grant?.expires_at ?? pro.periodEnd,
    cancelAtPeriodEnd: pro.cancelAtPeriodEnd,
  });
  const title = !pro.hasPro ? t('teacher.subscription.freePlanName') : gifted ? status : t('teacher.subscription.proPlanName');
  const detail = !pro.hasPro ? usage ?? t('teacher.subscription.freeForever') : gifted ? t('eduPlans.manage.giftedNote') : status;

  return (
    <div data-testid="subscription-card" data-plan={pro.hasPro ? 'pro' : 'free'} className={ROW}>
      <div className="min-w-0">
        <h2 className="font-neo-display text-xl font-black leading-tight text-neo-cream">{title}</h2>
        <p data-testid={!pro.hasPro && usage ? 'subscription-usage' : undefined} className="mt-1 font-neo-body text-sm font-semibold leading-snug text-neo-cream/80">
          {detail}
        </p>
        <Link href={`/${language}/legal/refund`} target="_blank" rel="noopener noreferrer" className={cn(NB_LINK, '-ms-2')}>
          {t('legal.refundPolicy')}
        </Link>
      </div>
      {!pro.hasPro ? (
        <Link href={`/${language}/teacher/upgrade`} data-testid="subscription-upgrade" className={cn(NB_SMALL, NB_BLOCK.lime, 'shrink-0 self-start sm:self-center')}>
          <Zap className="size-4" aria-hidden="true" />
          {t('teacher.subscription.upgradeNow')}
        </Link>
      ) : pro.portalUrl && !gifted ? (
        <a href={pro.portalUrl} target="_blank" rel="noopener noreferrer" className={cn(NB_SMALL, NB_BLOCK.cream, 'shrink-0 self-start sm:self-center')}>
          <ExternalLink className="size-4" aria-hidden="true" />
          {t('teacher.subscription.manageSubscription')}
        </a>
      ) : null}
    </div>
  );
}
