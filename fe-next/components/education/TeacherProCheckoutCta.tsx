'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

/**
 * Hard Teacher Pro checkout CTA for SSR classroom traffic.
 *
 * EducationHero and ProFramingSection sit behind AuthContext's `loading: true`
 * SSR default, so crawlers and slow first paints never saw a money path — only
 * soft "$9/month" copy in SEO JSON-LD. This block needs no auth state, mirrors
 * NoAccountCta's self-contained locale copy, and always ships in HTML.
 *
 * Destination is the upgrade page (`/{locale}/teacher/upgrade`), which owns the checkout POST.
 */

export type TeacherProCheckoutCopy = {
  heading: string;
  body: string;
  cta: string;
  note: string;
};

export const TEACHER_PRO_CHECKOUT_PATH = '/teacher/upgrade';

const LRI = '⁦';
const PDI = '⁩';
/** Left-to-right isolate: keeps "$9" and "Teacher Pro" whole inside RTL sentences. */
const ltr = (s: string) => `${LRI}${s}${PDI}`;
const PRO = ltr('Teacher Pro');

// First-paint fallback only: the locale-root landing ships a partial catalogue without eg2Pro.*.
const UPGRADE_CTA: Record<string, string> = {
  en: 'Upgrade to Teacher Pro',
  he: `שדרגו ל-${PRO}`,
  es: 'Mejora a Teacher Pro',
  sv: 'Uppgradera till Teacher Pro',
  ja: 'Teacher Proにアップグレード',
  ru: 'Перейти на Teacher Pro',
};

export function teacherProUpgradeCtaLabel(locale: string): string {
  return UPGRADE_CTA[locale.toLowerCase().split('-')[0]] ?? UPGRADE_CTA.en;
}

const COPY: Record<string, TeacherProCheckoutCopy> = {
  en: {
    heading: 'Teacher Pro — {price}/mo',
    body: 'Unlimited classes, analytics, and printable reports. Free stays free: {classes} classes × {students} students.',
    cta: 'Start Teacher Pro — {price}/mo',
    note: 'Cancel anytime · Free plan stays free',
  },
  he: {
    heading: `${PRO} — {price} לחודש`,
    body: 'כיתות ללא הגבלה, אנליטיקה ודוחות להדפסה. התוכנית החינמית נשארת: {classes} כיתות × {students} תלמידים.',
    cta: `התחלת ${PRO} — {price} לחודש`,
    note: 'ביטול בכל עת · התוכנית החינמית נשארת חינמית',
  },
  es: {
    heading: 'Teacher Pro — {price}/mes',
    body: 'Clases ilimitadas, analíticas e informes imprimibles. El plan gratis sigue: {classes} clases × {students} estudiantes.',
    cta: 'Empezar Teacher Pro — {price}/mes',
    note: 'Cancela cuando quieras · El plan gratis sigue gratis',
  },
  sv: {
    heading: 'Teacher Pro — {price}/mån',
    body: 'Obegränsade klasser, analys och utskrivbara rapporter. Gratisplanen finns kvar: {classes} klasser × {students} elever.',
    cta: 'Starta Teacher Pro — {price}/mån',
    note: 'Avsluta när du vill · Gratisplanen förblir gratis',
  },
  ja: {
    heading: 'Teacher Pro — 月{price}',
    body: 'クラス無制限、分析、印刷できるレポート。無料プランはそのまま：{classes}クラス × {students}人。',
    cta: 'Teacher Proを始める — 月{price}',
    note: 'いつでも解約できます · 無料プランはそのまま',
  },
  ru: {
    heading: 'Teacher Pro — {price}/мес',
    body: 'Безлимитные классы, аналитика и печатные отчёты. Бесплатный план остаётся: {classes} класса × {students} учеников.',
    cta: 'Подключить Teacher Pro — {price}/мес',
    note: 'Отмена в любой момент · Бесплатный план остаётся бесплатным',
  },
};

const RTL = new Set(['he']);

function ctaParams(locale: string): Record<string, string> {
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  return {
    price: RTL.has(locale.toLowerCase().split('-')[0]) ? ltr(price) : price,
    classes: String(FREE_TIER_LIMITS.classes),
    students: String(FREE_TIER_LIMITS.studentsPerClass),
  };
}

function fill(text: string, params: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
}

function rawCopy(locale: string): TeacherProCheckoutCopy {
  return COPY[locale.toLowerCase().split('-')[0]] ?? COPY.en;
}

export function teacherProCheckoutCopy(locale: string): TeacherProCheckoutCopy {
  const raw = rawCopy(locale);
  const p = ctaParams(locale);
  return { heading: fill(raw.heading, p), body: fill(raw.body, p), cta: fill(raw.cta, p), note: fill(raw.note, p) };
}

/** Short label for compact CTAs (homepage hero, secondary buttons). */
export function teacherProCheckoutCtaLabel(locale: string): string {
  return teacherProCheckoutCopy(locale).cta;
}

export function TeacherProCheckoutCta({
  locale,
  className = '',
  copy,
}: {
  locale: string;
  className?: string;
  copy?: TeacherProCheckoutCopy;
}): React.JSX.Element {
  const { t } = useLanguage();
  const raw = rawCopy(locale);
  const p = ctaParams(locale);
  const tr = (field: keyof TeacherProCheckoutCopy) => {
    const key = `eg2Pro.checkoutCta.${field}`;
    const value = t(key, raw[field], p);
    return value && value !== key ? value : fill(raw[field], p);
  };
  const c = copy ?? { heading: tr('heading'), body: tr('body'), cta: tr('cta'), note: tr('note') };
  return (
    <div
      data-testid="teacher-pro-checkout-cta"
      className={`max-w-xl rounded-neo border-2 border-s-4 border-neo-cream/40 border-s-neo-pink bg-neo-navy-light p-4 text-neo-white sm:p-5 ${className}`}
    >
      <p className="font-neo-display text-base font-bold leading-snug text-neo-pink-light sm:text-lg">
        {c.heading}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-neo-white/80">{c.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/${locale}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="teacher-pro-checkout-link"
          className="inline-flex min-h-11 items-center rounded-neo border-2 border-neo-black bg-neo-pink px-5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed"
        >
          {c.cta}
        </Link>
        <p className="text-xs font-semibold text-neo-white/65">{c.note}</p>
      </div>
    </div>
  );
}
