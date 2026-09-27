/**
 * One export path for both reports. The class and student reports each carried
 * a copy of the blob-and-anchor dance, and both copies forgot the same two
 * things: the document needs the language handed to it (no provider above
 * `pdf()`), and it needs a font that can draw that language.
 */
import React from 'react';

const toBlob = vi.fn();
const pdf = vi.fn((_el: React.ReactElement) => ({ toBlob }));
vi.mock('@react-pdf/renderer', () => ({
  pdf: (el: React.ReactElement) => pdf(el),
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
  Document: () => null, Page: () => null, View: () => null, Text: () => null,
  StyleSheet: { create: (s: unknown) => s },
}));

import { downloadReportPdf } from '../downloadReportPdf';
import type { ClassReportPDFData } from '../ProgressReportPDF';

const DATA = { type: 'class', classroomName: 'x' } as unknown as ClassReportPDFData;
const t = (k: string) => k;

describe('downloadReportPdf', () => {
  beforeEach(() => {
    pdf.mockClear();
    toBlob.mockReset().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('hands the document language, direction and the locale font', async () => {
    // GIVEN a Japanese teacher WHEN exporting
    await downloadReportPdf({ data: DATA, t, language: 'ja', dir: 'ltr', fileName: '3年 – report' });

    // THEN the element carries everything the provider-less render needs
    const props = pdf.mock.calls[0][0].props;
    expect(props.language).toBe('ja');
    expect(props.dir).toBe('ltr');
    expect(props.t).toBe(t);
    expect(props.fontFamily).toBe('ReportNotoSansJP');
  });

  it('downloads under the translated file name, stripped of path characters', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let name = '';
    click.mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });

    await downloadReportPdf({ data: DATA, t, language: 'he', dir: 'rtl', fileName: 'ז׳/2: דוח' });

    expect(name).toBe('ז׳2 דוח.pdf');
    click.mockRestore();
  });

  it('rejects when the PDF cannot be built, so the caller can show it', async () => {
    toBlob.mockRejectedValueOnce(new Error('font fetch blocked'));
    await expect(
      downloadReportPdf({ data: DATA, t, language: 'en', dir: 'ltr', fileName: 'x' })
    ).rejects.toThrow('font fetch blocked');
  });
});
