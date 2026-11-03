/**
 * Copy for the "Export class report (PDF)" button on the classroom round-results
 * screen (ReportPdfExportButton). Self-contained per locale, like
 * classReportTeaserCopy.ts. The Teacher Pro ask under the locked button (label
 * and note) always comes from resolveProOffer, so the single-trial rules hold.
 */
import { trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export type ReportPdfButtonCopy = {
  /** The button itself, for Pro and free teachers alike. */
  button: string;
  /** Accessible name of the locked (free teacher) button. */
  lockedLabel: string;
  /** While the PDF is being built. */
  preparing: string;
  /** When the PDF could not be built. */
  failed: string;
  /** The PDF's subject when the round has no lesson name. */
  fallbackName: string;
};

const COPY: Record<string, ReportPdfButtonCopy> = {
  en: {
    button: 'Export class report (PDF)',
    lockedLabel: 'Export class report (PDF), a Teacher Pro feature',
    preparing: 'Preparing the PDF…',
    failed: "The PDF didn't download. Try again.",
    fallbackName: 'Classroom round',
  },
  he: {
    button: 'ייצוא דוח כיתה (PDF)',
    lockedLabel: 'ייצוא דוח כיתה (PDF), תכונה של פרו למורים',
    preparing: 'מכינים את ה־PDF…',
    failed: 'ה־PDF לא ירד. נסו שוב.',
    fallbackName: 'סבב כיתתי',
  },
  es: {
    button: 'Exportar informe de la clase (PDF)',
    lockedLabel: 'Exportar informe de la clase (PDF), función de Teacher Pro',
    preparing: 'Preparando el PDF…',
    failed: 'El PDF no se descargó. Inténtalo de nuevo.',
    fallbackName: 'Ronda de clase',
  },
  sv: {
    button: 'Exportera klassrapport (PDF)',
    lockedLabel: 'Exportera klassrapport (PDF), en Teacher Pro-funktion',
    preparing: 'Förbereder PDF:en…',
    failed: 'PDF:en laddades inte ner. Försök igen.',
    fallbackName: 'Klassrunda',
  },
  ja: {
    button: 'クラスレポートを書き出す（PDF）',
    lockedLabel: 'クラスレポートを書き出す（PDF）、Teacher Pro の機能',
    preparing: 'PDF を準備しています…',
    failed: 'PDF をダウンロードできませんでした。もう一度お試しください。',
    fallbackName: 'クラスのラウンド',
  },
  ru: {
    button: 'Экспорт отчёта по классу (PDF)',
    lockedLabel: 'Экспорт отчёта по классу (PDF), функция Teacher Pro',
    preparing: 'Готовим PDF…',
    failed: 'PDF не скачался. Попробуйте ещё раз.',
    fallbackName: 'Раунд в классе',
  },
};

export const REPORT_PDF_BUTTON_LOCALES = Object.keys(COPY);

export function reportPdfButtonCopy(language: string): ReportPdfButtonCopy {
  return COPY[trialCopyBase(language)] ?? COPY.en;
}
