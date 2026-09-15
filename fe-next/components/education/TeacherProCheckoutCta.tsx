import * as React from 'react';
import Link from 'next/link';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

/**
 * Hard Teacher Pro checkout CTA for SSR classroom traffic.
 *
 * EducationHero and ProFramingSection sit behind AuthContext's `loading: true`
 * SSR default, so crawlers and slow first paints never saw a money path — only
 * soft "$9/month" copy in SEO JSON-LD. This block needs no auth state, mirrors
 * NoAccountCta's self-contained locale copy, and always ships in HTML.
 *
 * Destination is the live Polar front door (`/{locale}/teacher/upgrade`).
 * Do not invent a billing provider; the upgrade page no-ops when Polar env is
 * missing.
 */

export type TeacherProCheckoutCopy = {
  heading: string;
  body: string;
  cta: string;
  note: string;
};

export const TEACHER_PRO_CHECKOUT_PATH = '/teacher/upgrade';

const COPY: Record<string, TeacherProCheckoutCopy> = {
  en: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mo`,
    body: 'Unlimited classes, analytics, and printable reports. Free tier stays: 3 classes × 50 students.',
    cta: `Start Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mo`,
    note: 'Polar checkout · Cancel anytime · Free plan stays free',
  },
  he: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/חודש`,
    body: 'כיתות ללא הגבלה, אנליטיקה ודוחות להדפסה. התוכנית החינמית נשארת: 3 כיתות × 50 תלמידים.',
    cta: `התחלת Teacher Pro — $${TEACHER_PRO_PRICE_USD}/חודש`,
    note: 'תשלום Polar · ביטול בכל עת · התוכנית החינמית נשארת',
  },
  es: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mes`,
    body: 'Clases ilimitadas, analíticas e informes imprimibles. El plan gratis sigue: 3 clases × 50 estudiantes.',
    cta: `Empezar Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mes`,
    note: 'Pago Polar · Cancela cuando quieras · El plan gratis sigue gratis',
  },
  sv: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mån`,
    body: 'Obegränsade klasser, analys och utskrivbara rapporter. Gratisplanen finns kvar: 3 klasser × 50 elever.',
    cta: `Starta Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mån`,
    note: 'Polar-kassa · Avsluta när som helst · Gratisplanen förblir gratis',
  },
  ja: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/月`,
    body: 'クラス無制限、分析、印刷可能なレポート。無料枠はそのまま：3クラス × 50人。',
    cta: `Teacher Proを始める — $${TEACHER_PRO_PRICE_USD}/月`,
    note: 'Polar決済 · いつでも解約 · 無料プランはそのまま',
  },
  ru: {
    heading: `Teacher Pro — $${TEACHER_PRO_PRICE_USD}/мес`,
    body: 'Безлимитные классы, аналитика и печатные отчёты. Бесплатный план остаётся: 3 класса × 50 учеников.',
    cta: `Подключить Teacher Pro — $${TEACHER_PRO_PRICE_USD}/мес`,
    note: 'Оплата Polar · Отмена в любой момент · Бесплатный план остаётся',
  },
};

export function teacherProCheckoutCopy(locale: string): TeacherProCheckoutCopy {
  return COPY[locale.toLowerCase().split('-')[0]] ?? COPY.en;
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
  const c = copy ?? teacherProCheckoutCopy(locale);
  return (
    <div
      data-testid="teacher-pro-checkout-cta"
      className={`max-w-xl rounded-neo border-4 border-neo-black bg-neo-pink p-5 text-neo-white shadow-hard-lg sm:p-6 ${className}`}
    >
      <p className="font-neo-display text-lg font-black uppercase leading-[1.05] tracking-tight sm:text-xl">
        {c.heading}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-neo-white/90 sm:text-base">{c.body}</p>
      <Link
        href={`/${locale}${TEACHER_PRO_CHECKOUT_PATH}`}
        data-testid="teacher-pro-checkout-link"
        className="mt-4 inline-block rounded-neo border-4 border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-base font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg"
      >
        {c.cta}
      </Link>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neo-white/70">{c.note}</p>
    </div>
  );
}
