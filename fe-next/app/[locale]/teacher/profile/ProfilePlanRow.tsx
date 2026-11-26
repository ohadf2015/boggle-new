'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Gift, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_LINK, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { proPlanStatusLine } from '@/components/teacher/pro/proPlanStatus';
import { TeacherProCancelIntercept } from '@/components/teacher/TeacherProCancelIntercept';

const ROW = 'flex flex-col gap-3 border-t-2 border-neo-cream/15 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6';

/** `usage` is the free plan's one line, like "2 of 3 free classes used". */
export function ProfilePlanRow({ usage }: { usage?: string }) {
  const { t, language } = useLanguage();
  const pro = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const [keepOpen, setKeepOpen] = useState(false);

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

  const onCyan = pro.hasPro;

  return (
    <div
      data-testid="subscription-card"
      data-plan={pro.hasPro ? 'pro' : 'free'}
      className={cn(ROW, onCyan && 'border-y-[3px] border-neo-black bg-neo-cyan text-neo-black')}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className={cn('font-neo-display text-xl font-black leading-tight', onCyan ? 'text-neo-black' : 'text-neo-cream')}>{title}</h2>
          {gifted ? (
            <span className={cn(NB_STICKER, NB_BLOCK.lime)}>
              <Gift className="size-3.5" aria-hidden="true" />
              {t('teacher.subscription.giftedBadge')}
            </span>
          ) : null}
        </div>
        <p
          data-testid={!pro.hasPro && usage ? 'subscription-usage' : undefined}
          className={cn('mt-1 font-neo-body text-sm font-semibold leading-snug', onCyan ? 'text-neo-black/80' : 'text-neo-cream/80')}
        >
          {detail}
        </p>
        <Link
          href={`/${language}/legal/refund`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(NB_LINK, '-ms-2', onCyan && 'text-neo-black/85 hover:text-neo-black focus-visible:ring-neo-black focus-visible:ring-offset-neo-cyan')}
        >
          {t('legal.refundPolicy')}
        </Link>
      </div>
      {!pro.hasPro ? (
        <Link href={`/${language}/teacher/upgrade`} data-testid="subscription-upgrade" className={cn(NB_SMALL, NB_BLOCK.lime, 'shrink-0 self-start sm:self-center')}>
          <Zap className="size-4" aria-hidden="true" />
          {t('teacher.subscription.upgradeNow')}
        </Link>
      ) : pro.portalUrl && !gifted ? (
        <>
          <a
            href={pro.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(NB_SMALL, NB_BLOCK.cream, 'shrink-0 self-start sm:self-center')}
            onClick={(event) => {
              event.preventDefault();
              setKeepOpen(true);
            }}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t('teacher.subscription.manageSubscription')}
          </a>
          {keepOpen ? (
            <TeacherProCancelIntercept
              href={pro.portalUrl}
              phase={pro.status === 'trialing' ? 'trial' : 'paid'}
              surface="profile_plan"
              onClose={() => setKeepOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
