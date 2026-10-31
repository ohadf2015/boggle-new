/**
 * Copy for the "See this class's report" button on the classroom round-results
 * screen and the Teacher Pro teaser it opens for a free teacher. Self-contained
 * per locale (same pattern as trialCtaCopy.ts). The ask itself (button label,
 * note, keep-after-trial / trial-ended heading) always comes from
 * resolveProOffer, so the single-trial rules hold here too.
 */
import { trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export type ClassReportTeaserCopy = {
  /** The button under Play again. */
  button: string;
  /** Teaser heading. */
  title: string;
  /** Teaser line when some students found under half the words ({count}). */
  bodyStruggled: string;
  /** Same, exactly one student. */
  bodyStruggledOne: string;
  /** Teaser line when nobody was under half. */
  bodyNone: string;
  /** What the full report holds (one line). */
  includes: string;
  /** Close the teaser. */
  close: string;
  /** Heading while the free access trial is live: the report is open right now. */
  trialOpenTitle: string;
  /** Link to the real report (access trial live). */
  openReport: string;
};

const COPY: Record<string, ClassReportTeaserCopy> = {
  en: {
    button: "See this class's report",
    title: "This class's report comes with Teacher Pro",
    bodyStruggled: '{count} students found under half the words this round. The report shows who, word by word.',
    bodyStruggledOne: '1 student found under half the words this round. The report shows who, word by word.',
    bodyNone: 'The report shows how every student did, word by word, and which words to reteach.',
    includes: 'Who struggled · word mastery · CSV export',
    close: 'Close',
    trialOpenTitle: 'Your class report is open during your free trial',
    openReport: 'Open the class report',
  },
  he: {
    button: 'לדוח של הכיתה הזו',
    title: 'הדוח של הכיתה הזו כלול בפרו למורים',
    bodyStruggled: '{count} תלמידים מצאו פחות ממחצית המילים בסבב הזה. הדוח מראה מי, מילה אחר מילה.',
    bodyStruggledOne: 'תלמיד אחד מצא פחות ממחצית המילים בסבב הזה. הדוח מראה מי, מילה אחר מילה.',
    bodyNone: 'הדוח מראה איך כל תלמיד הצליח, מילה אחר מילה, ואילו מילים כדאי לתרגל שוב.',
    includes: 'מי התקשה · שליטה במילים · ייצוא ל־CSV',
    close: 'סגירה',
    trialOpenTitle: 'דוח הכיתה פתוח לכם בתקופת הניסיון החינמית',
    openReport: 'לפתיחת דוח הכיתה',
  },
  es: {
    button: 'Ver el informe de esta clase',
    title: 'El informe de esta clase viene con Teacher Pro',
    bodyStruggled: '{count} estudiantes encontraron menos de la mitad de las palabras en esta ronda. El informe muestra quiénes, palabra por palabra.',
    bodyStruggledOne: '1 estudiante encontró menos de la mitad de las palabras en esta ronda. El informe muestra quién, palabra por palabra.',
    bodyNone: 'El informe muestra cómo le fue a cada estudiante, palabra por palabra, y qué palabras repasar.',
    includes: 'Quién tuvo dificultades · dominio de palabras · exportación CSV',
    close: 'Cerrar',
    trialOpenTitle: 'El informe de tu clase está abierto durante tu prueba gratis',
    openReport: 'Abrir el informe de la clase',
  },
  sv: {
    button: 'Se klassens rapport',
    title: 'Klassens rapport ingår i Teacher Pro',
    bodyStruggled: '{count} elever hittade färre än hälften av orden den här rundan. Rapporten visar vilka, ord för ord.',
    bodyStruggledOne: '1 elev hittade färre än hälften av orden den här rundan. Rapporten visar vem, ord för ord.',
    bodyNone: 'Rapporten visar hur varje elev gick, ord för ord, och vilka ord ni bör öva igen.',
    includes: 'Vem som hade svårt · ordbehärskning · CSV-export',
    close: 'Stäng',
    trialOpenTitle: 'Klassrapporten är öppen under din gratisperiod',
    openReport: 'Öppna klassrapporten',
  },
  ja: {
    button: 'このクラスのレポートを見る',
    title: 'このクラスのレポートはTeacher Proで見られます',
    bodyStruggled: 'このラウンドで単語の半分未満しか見つけられなかった生徒が{count}人います。レポートでは誰が、どの単語でつまずいたかが分かります。',
    bodyStruggledOne: 'このラウンドで単語の半分未満しか見つけられなかった生徒が1人います。レポートでは誰が、どの単語でつまずいたかが分かります。',
    bodyNone: 'レポートでは生徒一人ひとりの結果を単語ごとに確認でき、復習すべき単語も分かります。',
    includes: 'つまずいた生徒 · 単語の習熟度 · CSVエクスポート',
    close: '閉じる',
    trialOpenTitle: '無料トライアル中はクラスレポートを見られます',
    openReport: 'クラスレポートを開く',
  },
  ru: {
    button: 'Отчёт по этому классу',
    title: 'Отчёт по этому классу входит в Teacher Pro',
    bodyStruggled: 'Учеников, нашедших меньше половины слов в этом раунде: {count}. Отчёт покажет, кто именно и на каких словах.',
    bodyStruggledOne: 'Один ученик нашёл меньше половины слов в этом раунде. Отчёт покажет, кто именно и на каких словах.',
    bodyNone: 'Отчёт покажет результат каждого ученика по словам и какие слова стоит повторить.',
    includes: 'Кому было трудно · освоение слов · экспорт в CSV',
    close: 'Закрыть',
    trialOpenTitle: 'Во время бесплатного пробного периода отчёт по классу открыт',
    openReport: 'Открыть отчёт по классу',
  },
};

export const CLASS_REPORT_TEASER_LOCALES = Object.keys(COPY);

export function classReportTeaserCopy(locale: string): ClassReportTeaserCopy {
  return COPY[trialCopyBase(locale)] ?? COPY.en;
}

/** The teaser line for this round: how many students found under half the words. */
export function classReportTeaserBody(copy: ClassReportTeaserCopy, underHalf: number): string {
  if (underHalf <= 0) return copy.bodyNone;
  if (underHalf === 1) return copy.bodyStruggledOne;
  return copy.bodyStruggled.replace('{count}', String(underHalf));
}
