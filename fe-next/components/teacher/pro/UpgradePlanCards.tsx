'use client';

import Link from 'next/link';
import { Check, X, Sparkles, School } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { trackEduProUpgradeClicked } from '@/lib/education/proFunnelTelemetry';
import { SCHOOL_PRICING } from '@/lib/education/pro/schoolPricing';
import { SchoolPriceTag } from './SchoolPriceTag';
import type { UpgradeViewer } from '@/lib/education/pro/upgradeViewer';

export interface UpgradePlanCardsProps {
  viewer: UpgradeViewer;
  freeFeatures: Array<{ label: string; included: boolean }>;
  proFeatures: string[];
  showTrial: boolean;
  pending: 'trial' | 'paid' | null;
  onTrial: () => void;
  onBuy: () => void;
  onSchool: () => void;
  /** Slot under the Pro buttons for the "ask your school to pay" panel. */
  askSchool?: React.ReactNode;
  /** Pro viewer only: a link to the billing portal, when the status read returned one. */
  manageBillingHref?: string | null;
}

const BTN =
  'inline-flex min-h-12 w-full items-center justify-center rounded-neo border-3 border-neo-black px-4 font-neo-display text-base font-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none';

function Price({ amount, per, testId, dark }: { amount: string; per: string; testId?: string; dark?: boolean }) {
  return (
    <p className={cn('flex items-baseline gap-1.5 font-neo-display font-black leading-none', dark ? 'text-neo-black' : 'text-neo-white')}>
      <bdi dir="ltr" data-testid={testId} className="text-4xl">{amount}</bdi>
      <span className={cn('text-sm font-bold', dark ? 'text-neo-black/75' : 'text-neo-white/70')}>{per}</span>
    </p>
  );
}

function BestFor({ text, dark }: { text: string; dark?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={cn('mt-4 border-t-2 pt-3', dark ? 'border-neo-black' : 'border-neo-cream/25')}>
      <p className={cn('text-[11px] font-black uppercase tracking-widest', dark ? 'text-neo-black/70' : 'text-neo-white/60')}>
        {t('eg2Pro.plans.bestFor')}
      </p>
      <p className={cn('mt-0.5 text-sm font-bold leading-snug', dark ? 'text-neo-black' : 'text-neo-white')}>{text}</p>
    </div>
  );
}

function FeatureList({ items, dark }: { items: Array<{ label: string; included: boolean }>; dark?: boolean }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((f) => (
        <li key={f.label} className="flex items-start gap-2">
          <span
            className={cn(
              'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-2',
              dark ? 'border-neo-black bg-neo-black' : f.included ? 'border-neo-black bg-neo-lime' : 'border-neo-cream/30',
            )}
          >
            {f.included ? (
              <Check className={cn('h-3 w-3', dark ? 'text-neo-cyan' : 'text-neo-black')} strokeWidth={3} aria-hidden />
            ) : (
              <X className="h-3 w-3 text-neo-white/40" strokeWidth={3} aria-hidden />
            )}
          </span>
          <span
            className={cn(
              'text-sm font-bold leading-snug',
              dark ? 'text-neo-black' : f.included ? 'text-neo-white' : 'text-neo-white/45 line-through decoration-2',
            )}
          >
            {f.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UpgradePlanCards({
  viewer,
  freeFeatures,
  proFeatures,
  showTrial,
  pending,
  onTrial,
  onBuy,
  onSchool,
  askSchool,
  manageBillingHref,
}: UpgradePlanCardsProps) {
  const { t, language } = useLanguage();
  const perMonth = t('teacher.subscription.perMonth');
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const busy = pending !== null;

  const buy = () => {
    try {
      trackEduProUpgradeClicked({ source: 'pricing_page' });
    } catch {
      /* analytics never blocks the till */
    }
    onBuy();
  };

  return (
    <div data-testid="pricing-cards" className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-5">
      <article
        data-testid="plan-card-free"
        className="order-2 flex flex-col rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-4 md:order-1 sm:p-5"
      >
        <h2 className="font-neo-display text-lg font-black text-neo-white">{t('teacher.subscription.freePlanName')}</h2>
        <p className="mb-3 text-xs font-bold text-neo-white/65">{t('teacher.subscription.freeForever')}</p>
        <Price amount="$0" per={perMonth} />
        <p data-testid="plan-free-note" className="mt-1.5 text-xs font-bold text-neo-white/65">
          {t('eg2Polish.plans.freeNote')}
        </p>
        <div className="mt-4 min-h-12">
          {viewer === 'anon' && (
            <Link href={`/${language}/education/access`} className={cn(BTN, 'bg-neo-white text-neo-black')}>
              {t('eg2Pro.plans.startFree')}
            </Link>
          )}
          {viewer === 'free' && (
            <button type="button" disabled data-testid="pricing-free-current" className={cn(BTN, 'cursor-default bg-transparent text-neo-white/70 shadow-none hover:translate-y-0 border-neo-cream/40')}>
              {t('teacher.subscription.currentPlan')}
            </button>
          )}
          {viewer === 'pro' && (
            <p data-testid="plan-free-included" className="flex min-h-12 items-center gap-2 rounded-neo border-2 border-dashed border-neo-cream/40 px-3 text-sm font-bold text-neo-white/80">
              <Check className="h-4 w-4 shrink-0 text-neo-cyan" strokeWidth={3} aria-hidden />
              {t('eg2Polish.plans.freeIncluded')}
            </p>
          )}
        </div>
        <BestFor text={t('eg2Pro.plans.freeBestFor')} />
        <FeatureList items={freeFeatures} />
      </article>

      <article
        data-testid="plan-card-pro"
        className="relative order-1 flex flex-col rounded-neo border-3 border-neo-black bg-neo-cyan p-4 shadow-hard-lg md:order-2 sm:p-5"
      >
        <span className="absolute -top-3 start-4 inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-pink px-2.5 py-0.5 font-neo-display text-xs font-black text-neo-black">
          <Sparkles className="h-3 w-3" strokeWidth={3} aria-hidden />
          {showTrial ? t('eg2Pro.plans.trialBadge', { days: TEACHER_PRO_TRIAL_DAYS }) : t('eg2Pro.plans.recommended')}
        </span>
        <h2 className="mt-1 font-neo-display text-lg font-black text-neo-black">{t('teacher.subscription.proPlanName')}</h2>
        <p className="mb-3 text-xs font-bold text-neo-black/75">{t('teacher.subscription.unlimitedAccess')}</p>
        <Price amount={price} per={perMonth} testId="plan-pro-price" dark />
        <p className="mt-1.5 text-xs font-bold text-neo-black/75">
          {t('teacher.subscription.pricePerDay')} · {t('teacher.subscription.priceTaxNote')}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {viewer === 'pro' ? (
            <>
              <p data-testid="pricing-pro-current" className={cn(BTN, 'cursor-default bg-neo-black text-neo-lime hover:translate-y-0')}>
                {t('eg2Pro.plans.youArePro')}
              </p>
              {manageBillingHref && (
                <a href={manageBillingHref} className="text-center text-sm font-black text-neo-black underline">
                  {t('eg2Pro.plans.manageBilling')}
                </a>
              )}
            </>
          ) : (
            <>
              {showTrial && (
                <button type="button" onClick={onTrial} disabled={busy} data-testid="pricing-trial-cta" className={cn(BTN, 'bg-neo-black text-neo-white')}>
                  {pending === 'trial' ? t('common.loading') : t('eg2Pro.plans.trialCta', { days: TEACHER_PRO_TRIAL_DAYS })}
                </button>
              )}
              <button
                type="button"
                onClick={buy}
                disabled={busy}
                data-testid="pricing-paid-cta"
                className={cn(BTN, showTrial ? 'min-h-11 bg-neo-cream text-neo-black text-sm' : 'bg-neo-black text-neo-white')}
              >
                {pending === 'paid' ? t('common.loading') : showTrial ? t('eg2Pro.plans.buyNowInstead', { price }) : t('eg2Pro.plans.buyCta', { price })}
              </button>
              <p className="text-center text-xs font-bold text-neo-black/80">
                {showTrial ? t('eg2Pro.plans.trialNote', { days: TEACHER_PRO_TRIAL_DAYS, price }) : t('teacher.subscription.proCtaSubtext')}
              </p>
              {askSchool}
            </>
          )}
        </div>
        <BestFor text={t('eg2Pro.plans.proBestFor')} dark />
        <FeatureList items={proFeatures.map((label) => ({ label, included: true }))} dark />
      </article>

      <article
        data-testid="plan-card-school"
        className="order-3 flex flex-col rounded-neo border-3 border-neo-black bg-neo-purple p-4 text-neo-white shadow-hard sm:p-5"
      >
        <h2 className="flex items-center gap-2 font-neo-display text-lg font-black">
          <School className="h-5 w-5" aria-hidden /> {t('eg2Pro.plans.schoolName')}
        </h2>
        <p className="mb-3 text-xs font-bold text-neo-white/80">{t('eg2Pro.plans.schoolTagline', { min: SCHOOL_PRICING.minTeachers })}</p>
        <SchoolPriceTag />
        <div className="mt-4 min-h-12">
          <button type="button" onClick={onSchool} data-testid="plan-school-cta" className={cn(BTN, 'bg-neo-yellow text-neo-black')}>
            {t('eg2Pro.plans.schoolCta')}
          </button>
        </div>
        <BestFor text={t('eg2Pro.plans.schoolBestFor')} />
        <FeatureList
          items={['schoolF1', 'schoolF2', 'schoolF3'].map((k) => ({ label: t(`eg2Pro.plans.${k}`), included: true }))}
        />
        <div className="mt-auto pt-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-neo-white/60">{t('eg2Pro.plans.howItWorks')}</p>
          <ol className="mt-2 space-y-2">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <li key={step} className="flex items-center gap-2 text-sm font-bold">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-neo-black bg-neo-yellow text-xs font-black text-neo-black">
                  {i + 1}
                </span>
                {t(`eg2Pro.school.${step}Title`)}
              </li>
            ))}
          </ol>
        </div>
      </article>
    </div>
  );
}
