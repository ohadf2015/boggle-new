/**
 * Two more paste failures from the live smoke run.
 *
 * 1. Several `word - definition` pairs on ONE line with no newline were merged
 *    into a single garbled record. Silently — the teacher saw one word where
 *    they pasted four. A line that carries more than one word is ambiguous, so
 *    it is refused as an error row rather than guessed at.
 * 2. The pasted text was ending up in the Lesson Name field. This pins that
 *    the importer touches nothing but its own textarea.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import BulkImportEnhanced, { splitImportLines, countWordBoundaries } from './BulkImportEnhanced';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useWordIntegration', () => ({ useWordIntegration: vi.fn() }));

const FOUR_ON_ONE_LINE =
  'hesitant - not sure about it reluctant - unwilling to act eager - keen to go timid - easily frightened';

describe('countWordBoundaries', () => {
  it('counts one for a single well-formed row', () => {
    expect(countWordBoundaries('hesitant - not sure about it')).toBe(1);
    expect(countWordBoundaries('hesitant - not sure | syn: unsure | level: core')).toBe(1);
  });

  it('counts a bare word as one', () => {
    expect(countWordBoundaries('hesitant')).toBe(1);
  });

  it('counts each pair when several are crammed onto one line', () => {
    expect(countWordBoundaries(FOUR_ON_ONE_LINE)).toBeGreaterThan(1);
  });

  it('does not miscount a hyphenated word or a dash inside a definition', () => {
    expect(countWordBoundaries('well-being - the state of being comfortable')).toBe(1);
    expect(countWordBoundaries('dash - a short line - used in writing')).toBe(1);
  });

  it('counts a repeated key as a second word', () => {
    expect(countWordBoundaries('a - one | level: core | b - two | level: support')).toBeGreaterThan(1);
    expect(countWordBoundaries('a - one | syn: x | syn: y')).toBeGreaterThan(1);
  });
});

describe('BulkImportEnhanced — several words crammed onto one line', () => {
  const onClose = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWordIntegration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      checkWordIntegration: vi.fn((word: string) => ({
        word: word.trim().toLowerCase(),
        canIntegrate: true,
      })),
    });
  });

  const paste = (value: string) => {
    render(<BulkImportEnhanced isOpen onClose={onClose} onImport={onImport} language="en" />);
    fireEvent.change(screen.getByPlaceholderText('teacher.lesson.bulkImportPlaceholder'), {
      target: { value },
    });
  };

  it('refuses the line instead of merging four words into one record', async () => {
    paste(FOUR_ON_ONE_LINE);

    expect(screen.getByTestId('bulk-import-unreadable')).toBeInTheDocument();

    // Nothing importable, so the button cannot produce a garbled word.
    const button = screen.getByText(/teacher.lesson.bulkImportButton/).closest('button')!;
    expect(button).toBeDisabled();
  });

  it('keeps the good rows and refuses only the crammed one', async () => {
    paste(`happy - feeling joy\n${FOUR_ON_ONE_LINE}\nbrave - not afraid`);

    expect(screen.getByTestId('bulk-import-unreadable')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0].map((w: { word: string }) => w.word)).toEqual([
      'happy',
      'brave',
    ]);
  });

  it('still accepts one word per line, however many lines', async () => {
    paste('hesitant - not sure about it\nreluctant - unwilling to act\neager - keen to go');

    expect(screen.queryByTestId('bulk-import-unreadable')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0]).toHaveLength(3);
  });

  it('still accepts a plain comma list of bare words', async () => {
    paste('cat, dog, bird, fish');
    expect(screen.queryByTestId('bulk-import-unreadable')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0]).toHaveLength(4);
  });

  it('the splitter still hands the crammed line through as one row to be judged', () => {
    expect(splitImportLines(FOUR_ON_ONE_LINE)).toEqual([FOUR_ON_ONE_LINE]);
  });
});

describe('BulkImportEnhanced — the importer owns only its own textarea', () => {
  const onClose = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWordIntegration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      checkWordIntegration: vi.fn((word: string) => ({
        word: word.trim().toLowerCase(),
        canIntegrate: true,
      })),
    });
  });

  it('reports pasted text through onImport only, never through another field', async () => {
    render(<BulkImportEnhanced isOpen onClose={onClose} onImport={onImport} language="en" />);
    const textarea = screen.getByPlaceholderText('teacher.lesson.bulkImportPlaceholder');
    fireEvent.change(textarea, { target: { value: 'happy - feeling joy' } });

    // The pasted text lives in the textarea and nowhere else.
    expect((textarea as HTMLTextAreaElement).value).toBe('happy - feeling joy');
    const inputs = screen.queryAllByRole('textbox').filter((el) => el !== textarea);
    expect(inputs.every((el) => (el as HTMLInputElement).value === '')).toBe(true);

    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0][0].word).toBe('happy');
  });
});
