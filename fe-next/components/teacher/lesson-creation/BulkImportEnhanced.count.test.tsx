/**
 * The import button must promise exactly what the import delivers.
 *
 * Live audit: pasting 10 biology terms showed "IMPORT 9 WORDS" while the save
 * correctly stored all 10. Root cause is two different arrays — the label read
 * `stats.ready` (rows whose word can be built on a board, `canIntegrate`) while
 * `handleImport` sends `importableRows` (every readable row, integrable or not).
 * A word the board cannot build is still a word the lesson keeps, so the label
 * was under-counting by one per such word.
 *
 * The same line also concatenated a hardcoded English " words", which the
 * translation-first rule forbids.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import BulkImportEnhanced from './BulkImportEnhanced';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params && 'count' in params ? `${key}:${params.count}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/useWordIntegration', () => ({ useWordIntegration: vi.fn() }));

// Ten real words; one of them cannot be built on a board. The lesson keeps it
// either way — exactly the shape that produced "IMPORT 9 WORDS" for 10 pasted.
const TEN_WORDS = [
  'photosynthesis',
  'mitochondria',
  'osmosis',
  'chlorophyll',
  'nucleus',
  'enzyme',
  'membrane',
  'organism',
  'habitat',
  'ecosystem',
].join('\n');

describe('BulkImportEnhanced — the button count matches the import', () => {
  const onClose = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWordIntegration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      checkWordIntegration: vi.fn((word: string) => ({
        word: word.trim().toLowerCase(),
        // The longest term is the one a board cannot build.
        canIntegrate: word.trim().toLowerCase() !== 'photosynthesis',
      })),
    });
  });

  const paste = () => {
    render(
      <BulkImportEnhanced isOpen onClose={onClose} onImport={onImport} language="en" />
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: TEN_WORDS } });
  };

  it('labels the button with the number it will actually import', () => {
    paste();
    const button = screen.getByRole('button', { name: /bulkImportButton/ });
    expect(button.textContent).toContain('10');
    expect(button.textContent).not.toContain('9');
  });

  it('imports exactly the number the button promised', () => {
    paste();
    fireEvent.click(screen.getByRole('button', { name: /bulkImportButton/ }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toHaveLength(10);
  });

  it('renders the count through a translation key, not a hardcoded English word', () => {
    paste();
    // The `t` mock echoes `<key>:<count>`, so the interpolated key is proof the
    // count goes through translation instead of a concatenated " words".
    const button = screen.getByRole('button', { name: /bulkImportButton/ });
    expect(button.textContent).toContain('teacher.lesson.words:10');
  });
});
