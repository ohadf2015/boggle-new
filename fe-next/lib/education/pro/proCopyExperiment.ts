/**
 * Teacher Pro offer copy A/B test (`edu_pro_copy_v1`), 50/50 per teacher.
 *
 * - Variant `a` (loss-led): leads with the one concrete thing a free teacher does
 *   not get — class reports (the who-struggled report after each round, word
 *   mastery, CSV export: all server-gated, see proFeatureBacking.ts) — and $9/mo.
 * - Variant `b` (trial-led): leads with the trial, under the single-trial rules.
 *
 * Only the heading and the body line change. The button, the note under it and
 * the checkout mode still come from resolveProOffer, so both variants keep the
 * single-trial rules:
 *   inside the free access trial -> "Keep Teacher Pro after your free trial"
 *   access trial ended           -> straight $9/mo, no trial wording, no new trial
 *   never trialed                -> the 14-day trial
 *
 * The bucket is a deterministic hash of the teacher's user id, computed the same
 * way in the browser (which copy to show) and on the server (the `copy_variant`
 * property on edu_pro_offer_rendered / edu_pro_offer_impression / edu_pro_offer_clicked),
 * so the client can never mislabel an event. No user id -> `b` (today's trial-led copy).
 */
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { formatTrialEnd } from '@/lib/education/pro/keepAfterTrialCopy';
import type { ProOffer } from '@/lib/education/pro/proOfferCopy';
import { TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export const PRO_COPY_EXPERIMENT = 'edu_pro_copy_v1' as const;
export type ProCopyVariant = 'a' | 'b';
export const PRO_COPY_VARIANTS: readonly ProCopyVariant[] = ['a', 'b'];
/**
 * Offer surfaces whose events carry the A/B bucket (access_success keeps its own button copy).
 * class_report_button is tagged too, so report-button clicks can be split by the copy the teacher saw.
 */
export const PRO_COPY_PLACEMENTS: ReadonlySet<string> = new Set(['class_created', 'classroom_results', 'dashboard', 'class_report_button']);

/** FNV-1a 32-bit — tiny, dependency-free, identical in Node and the browser. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function proCopyVariant(userId: string | null | undefined): ProCopyVariant {
  if (!userId) return 'b';
  return fnv1a(`${PRO_COPY_EXPERIMENT}:${userId}`) % 2 === 0 ? 'a' : 'b';
}

/** Which single-trial state the offer is in (drives the wording, never the checkout). */
export type ProOfferStage = 'never_trialed' | 'access_trial_live' | 'access_trial_ended' | 'trial_used';

export function proOfferStage(offer: Pick<ProOffer, 'offer' | 'title'>): ProOfferStage {
  if (offer.offer === 'keep_after_trial') return 'access_trial_live';
  if (offer.offer === 'trial') return 'never_trialed';
  // resolveProOffer sets a title only for the "access trial ended" paid ask.
  return offer.title ? 'access_trial_ended' : 'trial_used';
}

type Line = { title: string; body: string };
type VariantCopy = {
  never_trialed: Line;
  /** Heading for the class-ready screen (before any round has been played). */
  never_trialed_class_created: string;
  access_trial_live: Line;
  access_trial_ended: Line;
  trial_used: Line;
};

const COPY: Record<string, Record<ProCopyVariant, VariantCopy>> = {
  en: {
    a: {
      never_trialed: {
        title: 'Keep your class reports — {price}/mo',
        body: 'Without Teacher Pro, the who-struggled report after each round, word mastery and CSV export stay locked.',
      },
      never_trialed_class_created: 'Get class reports for your new class — {price}/mo',
      access_trial_live: {
        title: 'Keep your class reports: keep Teacher Pro after your free trial',
        body: 'On {date} your who-struggled reports, word mastery and CSV export lock again unless you keep Teacher Pro.',
      },
      access_trial_ended: {
        title: 'Get your class reports back — {price}/mo',
        body: 'Your free trial has ended, so who-struggled reports, word mastery and CSV export are locked again.',
      },
      trial_used: {
        title: 'Unlock your class reports — {price}/mo',
        body: 'The who-struggled report after each round, word mastery and CSV export come with Teacher Pro.',
      },
    },
    b: {
      never_trialed: {
        title: 'Try Teacher Pro free for {days} days',
        body: 'See who struggled after every round, track word mastery and export class reports to CSV.',
      },
      never_trialed_class_created: 'Try Teacher Pro free with your new class',
      access_trial_live: {
        title: 'Keep Teacher Pro after your free trial',
        body: 'Your class reports, word mastery and CSV export stay on after {date}.',
      },
      access_trial_ended: {
        title: 'Your free trial has ended: continue with Teacher Pro',
        body: 'Class reports, word mastery and CSV export for {price}/mo.',
      },
      trial_used: {
        title: 'Keep this class going with Teacher Pro',
        body: 'Class reports, word mastery and CSV export for {price}/mo.',
      },
    },
  },
  he: {
    a: {
      never_trialed: {
        title: 'שומרים על דוחות הכיתה — {price} לחודש',
        body: 'בלי פרו למורים, דוח "מי התקשה" אחרי כל סבב, שליטה במילים וייצוא ל־CSV נשארים נעולים.',
      },
      never_trialed_class_created: 'דוחות כיתה לכיתה החדשה — {price} לחודש',
      access_trial_live: {
        title: 'שומרים על דוחות הכיתה: ממשיכים עם פרו למורים אחרי תקופת הניסיון',
        body: 'ב־{date} דוחות "מי התקשה", שליטה במילים וייצוא ל־CSV יינעלו שוב, אלא אם תמשיכו עם פרו למורים.',
      },
      access_trial_ended: {
        title: 'מחזירים את דוחות הכיתה — {price} לחודש',
        body: 'תקופת הניסיון החינמית הסתיימה, ולכן דוחות "מי התקשה", שליטה במילים וייצוא ל־CSV נעולים שוב.',
      },
      trial_used: {
        title: 'פותחים את דוחות הכיתה — {price} לחודש',
        body: 'דוח "מי התקשה" אחרי כל סבב, שליטה במילים וייצוא ל־CSV כלולים בפרו למורים.',
      },
    },
    b: {
      never_trialed: {
        title: 'נסו את פרו למורים בחינם למשך {days} ימים',
        body: 'ראו מי התקשה אחרי כל סבב, עקבו אחרי שליטה במילים וייצאו דוחות כיתה ל־CSV.',
      },
      never_trialed_class_created: 'נסו את פרו למורים בחינם עם הכיתה החדשה',
      access_trial_live: {
        title: 'ממשיכים עם פרו למורים אחרי תקופת הניסיון',
        body: 'דוחות הכיתה, שליטה במילים וייצוא ל־CSV נשארים פתוחים גם אחרי {date}.',
      },
      access_trial_ended: {
        title: 'תקופת הניסיון החינמית הסתיימה: ממשיכים עם פרו למורים',
        body: 'דוחות כיתה, שליטה במילים וייצוא ל־CSV ב־{price} לחודש.',
      },
      trial_used: {
        title: 'ממשיכים עם הכיתה הזו בפרו למורים',
        body: 'דוחות כיתה, שליטה במילים וייצוא ל־CSV ב־{price} לחודש.',
      },
    },
  },
  es: {
    a: {
      never_trialed: {
        title: 'Conserva tus informes de clase — {price}/mes',
        body: 'Sin Teacher Pro, el informe de quién tuvo dificultades tras cada ronda, el dominio de palabras y la exportación CSV siguen bloqueados.',
      },
      never_trialed_class_created: 'Informes de clase para tu nueva clase — {price}/mes',
      access_trial_live: {
        title: 'Conserva tus informes de clase: sigue con Teacher Pro después de tu prueba gratis',
        body: 'El {date} tus informes de dificultades, el dominio de palabras y la exportación CSV se bloquean de nuevo si no sigues con Teacher Pro.',
      },
      access_trial_ended: {
        title: 'Recupera tus informes de clase — {price}/mes',
        body: 'Tu prueba gratis ha terminado, así que los informes de dificultades, el dominio de palabras y la exportación CSV están bloqueados.',
      },
      trial_used: {
        title: 'Desbloquea tus informes de clase — {price}/mes',
        body: 'El informe de quién tuvo dificultades tras cada ronda, el dominio de palabras y la exportación CSV vienen con Teacher Pro.',
      },
    },
    b: {
      never_trialed: {
        title: 'Prueba Teacher Pro gratis durante {days} días',
        body: 'Ve quién tuvo dificultades tras cada ronda, sigue el dominio de palabras y exporta informes de clase a CSV.',
      },
      never_trialed_class_created: 'Prueba Teacher Pro gratis con tu nueva clase',
      access_trial_live: {
        title: 'Sigue con Teacher Pro después de tu prueba gratis',
        body: 'Tus informes de clase, el dominio de palabras y la exportación CSV siguen activos después del {date}.',
      },
      access_trial_ended: {
        title: 'Tu prueba gratis ha terminado: continúa con Teacher Pro',
        body: 'Informes de clase, dominio de palabras y exportación CSV por {price}/mes.',
      },
      trial_used: {
        title: 'Sigue con esta clase con Teacher Pro',
        body: 'Informes de clase, dominio de palabras y exportación CSV por {price}/mes.',
      },
    },
  },
  sv: {
    a: {
      never_trialed: {
        title: 'Behåll dina klassrapporter — {price}/mån',
        body: 'Utan Teacher Pro är rapporten om vem som hade svårt efter varje runda, ordbehärskning och CSV-export låsta.',
      },
      never_trialed_class_created: 'Klassrapporter för din nya klass — {price}/mån',
      access_trial_live: {
        title: 'Behåll dina klassrapporter: behåll Teacher Pro efter din gratisperiod',
        body: 'Den {date} låses rapporterna, ordbehärskning och CSV-export igen om du inte behåller Teacher Pro.',
      },
      access_trial_ended: {
        title: 'Få tillbaka dina klassrapporter — {price}/mån',
        body: 'Din gratisperiod har tagit slut, så rapporterna, ordbehärskning och CSV-export är låsta igen.',
      },
      trial_used: {
        title: 'Lås upp dina klassrapporter — {price}/mån',
        body: 'Rapporten om vem som hade svårt efter varje runda, ordbehärskning och CSV-export ingår i Teacher Pro.',
      },
    },
    b: {
      never_trialed: {
        title: 'Prova Teacher Pro gratis i {days} dagar',
        body: 'Se vem som hade svårt efter varje runda, följ ordbehärskning och exportera klassrapporter till CSV.',
      },
      never_trialed_class_created: 'Prova Teacher Pro gratis med din nya klass',
      access_trial_live: {
        title: 'Behåll Teacher Pro efter din gratisperiod',
        body: 'Dina klassrapporter, ordbehärskning och CSV-export finns kvar efter {date}.',
      },
      access_trial_ended: {
        title: 'Din gratisperiod har tagit slut: fortsätt med Teacher Pro',
        body: 'Klassrapporter, ordbehärskning och CSV-export för {price}/mån.',
      },
      trial_used: {
        title: 'Fortsätt med klassen i Teacher Pro',
        body: 'Klassrapporter, ordbehärskning och CSV-export för {price}/mån.',
      },
    },
  },
  ja: {
    a: {
      never_trialed: {
        title: 'クラスレポートを手放さない — 月{price}',
        body: 'Teacher Proがないと、毎ラウンド後の「つまずいた生徒」レポート、単語の習熟度、CSV書き出しは使えません。',
      },
      never_trialed_class_created: '新しいクラスにクラスレポートを — 月{price}',
      access_trial_live: {
        title: 'クラスレポートを残す：無料トライアル後もTeacher Proを続ける',
        body: '{date}以降、Teacher Proを続けないと「つまずいた生徒」レポート、単語の習熟度、CSV書き出しは再びロックされます。',
      },
      access_trial_ended: {
        title: 'クラスレポートを取り戻す — 月{price}',
        body: '無料トライアルが終了したため、「つまずいた生徒」レポート、単語の習熟度、CSV書き出しは再びロックされています。',
      },
      trial_used: {
        title: 'クラスレポートを使えるようにする — 月{price}',
        body: '毎ラウンド後の「つまずいた生徒」レポート、単語の習熟度、CSV書き出しはTeacher Proで使えます。',
      },
    },
    b: {
      never_trialed: {
        title: 'Teacher Proを{days}日間無料で試す',
        body: '毎ラウンド後につまずいた生徒を確認し、単語の習熟度を追い、クラスレポートをCSVで書き出せます。',
      },
      never_trialed_class_created: '新しいクラスでTeacher Proを無料で試す',
      access_trial_live: {
        title: '無料トライアル後もTeacher Proを続ける',
        body: 'クラスレポート、単語の習熟度、CSV書き出しは{date}以降もそのまま使えます。',
      },
      access_trial_ended: {
        title: '無料トライアルは終了しました：Teacher Proを続ける',
        body: 'クラスレポート、単語の習熟度、CSV書き出しが月{price}。',
      },
      trial_used: {
        title: 'Teacher Proでこのクラスを続けましょう',
        body: 'クラスレポート、単語の習熟度、CSV書き出しが月{price}。',
      },
    },
  },
  ru: {
    a: {
      never_trialed: {
        title: 'Сохраните отчёты по классу — {price}/мес',
        body: 'Без Teacher Pro отчёт «кому было трудно» после каждого раунда, освоение слов и экспорт в CSV остаются закрытыми.',
      },
      never_trialed_class_created: 'Отчёты для вашего нового класса — {price}/мес',
      access_trial_live: {
        title: 'Сохраните отчёты по классу: сохраните Teacher Pro после бесплатного периода',
        body: '{date} отчёты «кому было трудно», освоение слов и экспорт в CSV снова закроются, если не сохранить Teacher Pro.',
      },
      access_trial_ended: {
        title: 'Верните отчёты по классу — {price}/мес',
        body: 'Бесплатный период закончился, поэтому отчёты «кому было трудно», освоение слов и экспорт в CSV снова закрыты.',
      },
      trial_used: {
        title: 'Откройте отчёты по классу — {price}/мес',
        body: 'Отчёт «кому было трудно» после каждого раунда, освоение слов и экспорт в CSV входят в Teacher Pro.',
      },
    },
    b: {
      never_trialed: {
        title: 'Попробуйте Teacher Pro бесплатно {days} дней',
        body: 'Смотрите, кому было трудно после каждого раунда, следите за освоением слов и выгружайте отчёты в CSV.',
      },
      never_trialed_class_created: 'Попробуйте Teacher Pro бесплатно с новым классом',
      access_trial_live: {
        title: 'Сохраните Teacher Pro после бесплатного периода',
        body: 'Отчёты по классу, освоение слов и экспорт в CSV останутся после {date}.',
      },
      access_trial_ended: {
        title: 'Бесплатный период закончился: продолжите с Teacher Pro',
        body: 'Отчёты по классу, освоение слов и экспорт в CSV за {price}/мес.',
      },
      trial_used: {
        title: 'Продолжите с этим классом в Teacher Pro',
        body: 'Отчёты по классу, освоение слов и экспорт в CSV за {price}/мес.',
      },
    },
  },
};

export const PRO_COPY_LOCALES = Object.keys(COPY);

const LRI = '\u2066';
const PDI = '\u2069';

export interface ProCopyLines {
  variant: ProCopyVariant;
  stage: ProOfferStage;
  title: string;
  body: string;
}

/**
 * Heading + body for this teacher's bucket and single-trial stage.
 * `accessTrialExpires` fills {date} on the "inside the access trial" lines.
 */
export function proCopyLines(
  language: string,
  variant: ProCopyVariant,
  offer: Pick<ProOffer, 'offer' | 'title'>,
  opts: { accessTrialExpires?: string | null; placement?: string } = {},
): ProCopyLines {
  const l = trialCopyBase(language);
  const known = COPY[l] ? l : 'en';
  const raw = COPY[known][variant];
  const rtl = TRIAL_COPY_RTL.has(known);
  const wrap = (s: string) => (rtl ? `${LRI}${s}${PDI}` : s);
  const params: Record<string, string> = {
    price: wrap(`$${TEACHER_PRO_PRICE_USD}`),
    days: String(TEACHER_PRO_TRIAL_DAYS),
    date: opts.accessTrialExpires ? wrap(formatTrialEnd(opts.accessTrialExpires, known)) : '',
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
  const stage = proOfferStage(offer);
  const line = raw[stage];
  const title = stage === 'never_trialed' && opts.placement === 'class_created' ? raw.never_trialed_class_created : line.title;
  return { variant, stage, title: fill(title), body: fill(line.body) };
}
