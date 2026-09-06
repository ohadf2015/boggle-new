/**
 * How pasted text becomes rows.
 *
 * A live smoke run pasted ONE rich line and got two corrupted rows out of it:
 * the synonyms truncated to their first token, and the antonym plus example
 * sentence stranded on a phantom wordless row. Cause: with no newline in the
 * text, the splitter fell through to splitting on every comma, which cuts a
 * rich line in half at `syn: a, b`.
 *
 * The parser tests never caught it because they hand `parseBulkImportLine` a
 * single line directly and never exercise the splitter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import BulkImportEnhanced, { splitImportLines } from './BulkImportEnhanced';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useWordIntegration', () => ({ useWordIntegration: vi.fn() }));

const RICH_LINE =
  'hesitant - not sure about doing something | syn: hesitant, unwilling | ant: eager | ex: She was ___ to jump in. | level: core';

describe('splitImportLines', () => {
  it('keeps a single rich line whole instead of cutting it at every comma', () => {
    expect(splitImportLines(RICH_LINE)).toEqual([RICH_LINE]);
  });

  it('keeps a single `word - definition` line whole', () => {
    expect(splitImportLines('happy - feeling joy')).toEqual(['happy - feeling joy']);
  });

  it('still splits a plain comma-separated word list', () => {
    expect(splitImportLines('cat, dog, bird')).toEqual(['cat', 'dog', 'bird']);
  });

  it('still splits a plain space-separated word list', () => {
    expect(splitImportLines('cat dog bird')).toEqual(['cat', 'dog', 'bird']);
  });

  it('splits on newlines and never on the commas inside a row', () => {
    expect(splitImportLines(`${RICH_LINE}\nbrave - not afraid | syn: bold, gutsy`)).toEqual([
      RICH_LINE,
      'brave - not afraid | syn: bold, gutsy',
    ]);
  });

  it('drops blank lines and trims each row', () => {
    expect(splitImportLines('  cat  \n\n  dog  \n')).toEqual(['cat', 'dog']);
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(splitImportLines('')).toEqual([]);
    expect(splitImportLines('   \n  ')).toEqual([]);
  });
});

describe('BulkImportEnhanced — one pasted rich line', () => {
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

  it('round-trips every field of one pasted line into exactly one word', async () => {
    paste(RICH_LINE);
    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));

    await waitFor(() => expect(onImport).toHaveBeenCalled());
    const words = onImport.mock.calls[0][0];
    expect(words).toHaveLength(1);
    expect(words[0]).toEqual({
      word: 'hesitant',
      definition: 'not sure about doing something',
      canIntegrate: true,
      synonyms: ['hesitant', 'unwilling'],
      antonyms: ['eager'],
      example: 'She was ___ to jump in.',
      level: 'core',
    });
  });

  it('round-trips the newer mean: and root: keys from one pasted line', async () => {
    paste('bank - a place for money | mean: the land beside a river; a place for money | root: banc = bench');
    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));

    await waitFor(() => expect(onImport).toHaveBeenCalled());
    const words = onImport.mock.calls[0][0];
    expect(words).toHaveLength(1);
    expect(words[0].meanings).toEqual(['the land beside a river', 'a place for money']);
    expect(words[0].morphology).toEqual({ root: 'banc', rootMeaning: 'bench' });
  });
});

describe('BulkImportEnhanced — unparsable rows are shown, never dropped in silence', () => {
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

  it('flags a row with no word and keeps it out of the import', async () => {
    paste('happy - feeling joy\n| syn: orphaned, segments\nbrave - not afraid');

    // The teacher is told, on screen, that a row could not be read
    expect(screen.getByTestId('bulk-import-unreadable')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    const words = onImport.mock.calls[0][0];
    expect(words.map((w: { word: string }) => w.word)).toEqual(['happy', 'brave']);
    expect(words.every((w: { word: string }) => w.word.length > 0)).toBe(true);
  });

  it('says nothing about unreadable rows when every row parses', () => {
    paste('happy - feeling joy\nbrave - not afraid');
    expect(screen.queryByTestId('bulk-import-unreadable')).not.toBeInTheDocument();
  });
});
