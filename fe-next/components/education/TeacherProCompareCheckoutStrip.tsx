/**
 * Shared Teacher Pro checkout strip for public classroom compare pages.
 *
 * Server component on purpose. Mentimeter honesty strips are client components
 * and throw during compare boot if the language provider is missing. This strip
 * takes `locale` and does not call that hook, so mounting it cannot crash boot.
 *
 * Price and caps come from freeTierLimits — the same numbers as
 * TeacherProCheckoutCta. Schools ($49/teacher/year) stay lead-capture
 * (educationPackages.ts). This strip only links /teacher/upgrade.
 */
import { Check } from 'lucide-react';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { PLAN_TABLE_ROWS, type PlanCell } from '@/lib/education/proFeatures';
import { TeacherProUpgradeLink } from '@/components/education/TeacherProUpgradeLink';
import { LandingProPill } from '@/components/education/LandingProPill';

export const TEACHER_PRO_COMPARE_CHECKOUT_PATH = '/teacher/upgrade' as const;

type Copy = { eyebrow: string; heading: string; body: string; cta: string; note: string };

/** The named limits a teacher hits first, then what Pro adds. Values come from PLAN_TABLE_ROWS. */
const TABLE_ROWS = ['classes', 'students', 'assignments', 'analytics', 'reports'] as const;
type TableRowId = (typeof TABLE_ROWS)[number];
type TableCopy = { pill: string; free: string; unlimited: string; included: string; notIncluded: string; rows: Record<TableRowId, string> };

const TABLE: Record<string, TableCopy> = {
  en: { pill: 'Pro', free: 'Free', unlimited: 'Unlimited', included: 'Included', notIncluded: 'Not included', rows: { classes: 'Classes', students: 'Students per class', assignments: 'Assignments per class', analytics: 'Per-student analytics', reports: 'Printable class reports' } },
  he: { pill: 'פרו', free: 'חינם', unlimited: 'ללא הגבלה', included: 'כלול', notIncluded: 'לא כלול', rows: { classes: 'כיתות', students: 'תלמידים בכל כיתה', assignments: 'מטלות בכל כיתה', analytics: 'מעקב התקדמות לכל תלמיד', reports: 'דוחות כיתה להדפסה' } },
  es: { pill: 'Pro', free: 'Gratis', unlimited: 'Ilimitado', included: 'Incluido', notIncluded: 'No incluido', rows: { classes: 'Clases', students: 'Estudiantes por clase', assignments: 'Tareas por clase', analytics: 'Analíticas por estudiante', reports: 'Informes de clase imprimibles' } },
  sv: { pill: 'Pro', free: 'Gratis', unlimited: 'Obegränsat', included: 'Ingår', notIncluded: 'Ingår inte', rows: { classes: 'Klasser', students: 'Elever per klass', assignments: 'Uppgifter per klass', analytics: 'Statistik per elev', reports: 'Utskrivbara klassrapporter' } },
  ja: { pill: 'Pro', free: '無料', unlimited: '無制限', included: '含む', notIncluded: '含まない', rows: { classes: 'クラス数', students: '1クラスの生徒数', assignments: '1クラスの課題数', analytics: '生徒ごとの分析', reports: '印刷できるクラスレポート' } },
  ru: { pill: 'Pro', free: 'Бесплатно', unlimited: 'Без ограничений', included: 'Включено', notIncluded: 'Не включено', rows: { classes: 'Классы', students: 'Учеников в классе', assignments: 'Заданий на класс', analytics: 'Аналитика по ученикам', reports: 'Отчёты по классу для печати' } },
};

const LRI = '⁦';
const PDI = '⁩';
const ltr = (s: string) => `${LRI}${s}${PDI}`;
const PRO_HE = 'פרו למורים';

const COPY: Record<string, Copy> = {
  en: {
    eyebrow: 'Teacher Pro',
    heading: 'Teacher Pro — {price}/mo',
    body: 'Unlimited classes, analytics, and printable reports. Free stays free: {classes} classes × {students} students.',
    cta: 'Start Teacher Pro — {price}/mo',
    note: 'Cancel anytime · Free plan stays free',
  },
  he: {
    eyebrow: PRO_HE,
    heading: `${PRO_HE} — {price} לחודש`,
    body: 'כיתות ללא הגבלה, אנליטיקה ודוחות להדפסה. התוכנית החינמית נשארת: {classes} כיתות × {students} תלמידים.',
    cta: `התחלת ${PRO_HE} — {price} לחודש`,
    note: 'ביטול בכל עת · התוכנית החינמית נשארת חינמית',
  },
  es: {
    eyebrow: 'Teacher Pro',
    heading: 'Teacher Pro — {price}/mes',
    body: 'Clases ilimitadas, analíticas e informes imprimibles. El plan gratis sigue: {classes} clases × {students} estudiantes.',
    cta: 'Empezar Teacher Pro — {price}/mes',
    note: 'Cancela cuando quieras · El plan gratis sigue gratis',
  },
  sv: {
    eyebrow: 'Teacher Pro',
    heading: 'Teacher Pro — {price}/mån',
    body: 'Obegränsade klasser, analys och utskrivbara rapporter. Gratisplanen finns kvar: {classes} klasser × {students} elever.',
    cta: 'Starta Teacher Pro — {price}/mån',
    note: 'Avsluta när du vill · Gratisplanen förblir gratis',
  },
  ja: {
    eyebrow: 'Teacher Pro',
    heading: 'Teacher Pro — 月{price}',
    body: 'クラス無制限、分析、印刷できるレポート。無料プランはそのまま：{classes}クラス × {students}人。',
    cta: 'Teacher Proを始める — 月{price}',
    note: 'いつでも解約できます · 無料プランはそのまま',
  },
  ru: {
    eyebrow: 'Teacher Pro',
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

function langOf(locale: string): string {
  return locale.toLowerCase().split('-')[0] || 'en';
}

export function teacherProCompareTable(locale: string) {
  const copy = TABLE[langOf(locale)] ?? TABLE.en;
  return {
    copy,
    rows: TABLE_ROWS.map((id) => {
      const row = PLAN_TABLE_ROWS.find((r) => r.id === id)!;
      return { id, label: copy.rows[id], free: row.free, pro: row.pro };
    }),
  };
}

export function teacherProCompareCheckoutCopy(locale: string): Copy {
  const lang = langOf(locale);
  const raw = COPY[lang] ?? COPY.en;
  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const params = {
    price: RTL.has(lang) ? ltr(price) : price,
    classes: String(FREE_TIER_LIMITS.classes),
    students: String(FREE_TIER_LIMITS.studentsPerClass),
  };
  return {
    eyebrow: raw.eyebrow,
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
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-pink">{c.eyebrow}</p>
      <h2 className="mb-2 font-neo-display text-2xl font-bold text-neo-white">{c.heading}</h2>
      <p className="mb-4 text-sm leading-relaxed text-neo-gray-200 sm:text-base">{c.body}</p>
      <PlanMiniTable locale={locale} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TeacherProUpgradeLink
          href={`/${locale}${TEACHER_PRO_COMPARE_CHECKOUT_PATH}`}
          locale={locale}
          placement="education_compare_strip"
          testId="teacher-pro-compare-checkout-link"
          className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition hover:shadow-hard-lg"
        >
          {c.cta}
        </TeacherProUpgradeLink>
        <p className="text-xs font-semibold text-neo-white/70">{c.note}</p>
      </div>
    </aside>
  );
}

function MiniCell({ value, copy }: { value: PlanCell; copy: TableCopy }) {
  if (value === null) return <span className="font-black text-neo-yellow">{copy.unlimited}</span>;
  if (typeof value === 'number') return <bdi dir="ltr" className="font-black tabular-nums">{value}</bdi>;
  if (value) {
    return (
      <>
        <Check className="mx-auto size-5 text-neo-yellow" strokeWidth={3} aria-hidden="true" />
        <span className="sr-only">{copy.included}</span>
      </>
    );
  }
  return (
    <>
      <span aria-hidden="true" className="font-black text-neo-white/60">—</span>
      <span className="sr-only">{copy.notIncluded}</span>
    </>
  );
}

function PlanMiniTable({ locale }: { locale: string }) {
  const { copy, rows } = teacherProCompareTable(locale);
  return (
    <table data-testid="teacher-pro-compare-table" className="mb-5 w-full max-w-lg table-fixed border-collapse text-sm text-neo-white">
      <colgroup>
        <col />
        <col className="w-20" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr className="border-b-2 border-neo-cream/40">
          <th scope="col" className="pb-2" />
          <th scope="col" className="pb-2 text-center font-neo-display font-black">{copy.free}</th>
          <th scope="col" className="bg-neo-yellow/10 pb-2 pt-1 text-center">
            <LandingProPill label={copy.pill} />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-neo-cream/15 last:border-b-0">
            <th scope="row" className="py-1.5 pe-2 text-start font-bold leading-snug">{row.label}</th>
            <td className="py-1.5 text-center"><MiniCell value={row.free} copy={copy} /></td>
            <td className="bg-neo-yellow/10 py-1.5 text-center"><MiniCell value={row.pro} copy={copy} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
