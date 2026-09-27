/**
 * react-pdf's built-in Helvetica has no Hebrew, Cyrillic or Japanese glyphs.
 * Each export registers ONE full-coverage family for the teacher's language —
 * per-glyph fallback arrays across subset fonts rendered garbage glyphs when
 * probed against @react-pdf/renderer 4.3.2.
 */
const { register } = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('@react-pdf/renderer', () => ({
  Font: { register, registerHyphenationCallback: vi.fn() },
}));

import { registerReportFonts } from '../reportPdfFonts';

describe('registerReportFonts', () => {
  beforeEach(() => register.mockClear());

  it.each(['en', 'he', 'sv', 'es', 'ru'])('uses Rubik (Latin + Hebrew + Cyrillic) for %s', (lang) => {
    expect(registerReportFonts(lang)).toBe('ReportRubik');
  });

  it('uses Noto Sans JP for Japanese', () => {
    // GIVEN a Japanese teacher WHEN fonts register THEN the JP family is used
    expect(registerReportFonts('ja')).toBe('ReportNotoSansJP');
    const call = register.mock.calls.find(([arg]) => arg.family === 'ReportNotoSansJP');
    expect(call?.[0].fonts.map((f: { src: string }) => f.src)).toEqual([
      '/fonts/pdf/NotoSansJP-Regular.ttf',
      '/fonts/pdf/NotoSansJP-Bold.ttf',
    ]);
  });

  it('registers a regular AND a bold face so headings are really bold', () => {
    registerReportFonts('he', '/base');
    const call = register.mock.calls.find(([arg]) => arg.family === 'ReportRubik');
    expect(call?.[0].fonts).toEqual([
      { src: '/base/fonts/pdf/Rubik-Regular.ttf', fontWeight: 400 },
      { src: '/base/fonts/pdf/Rubik-Bold.ttf', fontWeight: 700 },
    ]);
  });
});
