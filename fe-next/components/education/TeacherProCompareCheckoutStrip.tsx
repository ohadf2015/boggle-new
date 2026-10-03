/**
 * Shared Teacher Pro checkout strip for public classroom compare pages.
 *
 * Server component on purpose. Mentimeter honesty strips are client components
 * and throw during compare boot if the language provider is missing. This strip
 * takes `locale` and does not call that hook, so mounting it cannot crash boot.
 *
 * Price and caps come from freeTierLimits — the same numbers as
 * TeacherProCheckoutCta. Classroom term plan and Schools stay lead-capture
 * (educationPackages.ts). This strip only links /teacher/upgrade.
 */
import Link from 'next/link';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

export const TEACHER_PRO_COMPARE_CHECKOUT_PATH = '/teacher/upgrade' as const;

type Copy = { heading: string; body: string; cta: string; note: string };

const LRI = '⁦';
const PDI = '⁩';
const ltr = (s: string) => `${LRI}${s}${PDI}`;
const PRO_HE = 'פרו למורים';

const COPY: Record<string, Copy> = {
  en: {
    heading: 'Teacher Pro — {price}/mo',
    body: 'Unlimited classes, analytics, and printable reports. Free stays free: {classes} classes × {students} students.',
    cta: 'Start Teacher Pro — {price}/mo',
    note: 'Cancel anytime · Free plan stays free',
  },
  he: {
    heading: `${PRO_HE} — {price} לחודש`,
    body: 'כיתות ללא הגבלה, אנליטיקה ודוחות להדפסה. התוכנית החינמית נשארת: {classes} כיתות × {students} תלמידים.',
    cta: `התחלת ${PRO_HE} — {price} לחודש`,
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

function fill(text: string, params: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
}

export function teacherProCompareCheckoutCopy(locale: string): Copy {
  const lang = locale.toLowerCase().split('-')[0] || 'en';
  const raw = COPY[lang] ?? COPY.en;
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const params = {
    price: RTL.has(lang) ? ltr(price) : price,
    classes: String(FREE_TIER_LIMITS.classes),
    students: String(FREE_TIER_LIMITS.studentsPerClass),
  };
  return {
    heading: fill(raw.heading, params),
    body: fill(raw.body, params),
    cta: fill(raw.cta, params),
    note: fill(raw.note, params),
  };
}

export function TeacherProCompareCheckoutStrip({
  locale,
  className = '',
}: {
  locale: string;
  className?: string;
}) {
  const c = teacherProCompareCheckoutCopy(locale);
  return (
    <aside
      data-testid="teacher-pro-compare-checkout-strip"
      className={`mb-12 rounded-neo border-3 border-neo-pink bg-neo-navy/60 p-5 shadow-hard sm:p-6 ${className}`}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-pink">Teacher Pro</p>
      <h2 className="mb-2 font-neo-display text-2xl font-bold text-neo-white">{c.heading}</h2>
      <p className="mb-4 text-sm leading-relaxed text-neo-gray-200 sm:text-base">{c.body}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/${locale}${TEACHER_PRO_COMPARE_CHECKOUT_PATH}`}
          data-testid="teacher-pro-compare-checkout-link"
          className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
        >
          {c.cta}
        </Link>
        <p className="text-xs font-semibold text-neo-white/70">{c.note}</p>
      </div>
    </aside>
  );
}
