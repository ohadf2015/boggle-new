import type { ReportPDFData } from './ProgressReportPDF';
import type { ReportT } from './reportLabels';

interface DownloadReportPdfArgs {
  data: ReportPDFData;
  t: ReportT;
  language: string;
  dir: 'ltr' | 'rtl';
  /** Translated, without extension. */
  fileName: string;
}

/**
 * Build the report PDF in the browser and download it.
 *
 * `pdf()` renders in react-pdf's own root — no LanguageProvider above it — so
 * the language travels as props. Throws on failure: the caller owns the
 * visible error (a school network blocking the font fetch lands here).
 */
export async function downloadReportPdf({ data, t, language, dir, fileName }: DownloadReportPdfArgs) {
  // Loaded on click: react-pdf + fontkit are ~1MB the report screen never needs.
  const [{ pdf }, { ProgressReportPDF }, { registerReportFonts }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ProgressReportPDF'),
    import('./reportPdfFonts'),
  ]);

  const fontFamily = registerReportFonts(language);
  const blob = await pdf(
    <ProgressReportPDF data={data} t={t} language={language} dir={dir} fontFamily={fontFamily} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim()}.pdf`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
