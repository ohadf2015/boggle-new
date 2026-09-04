/**
 * BulkImportEnhanced — extended line format
 *   word - definition | syn: a, b | ant: c | ex: The ___ ran. | level: challenge
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BulkImportEnhanced, { parseBulkImportLine } from './BulkImportEnhanced';
import { useWordIntegration } from '@/hooks/useWordIntegration';

vi.mock('@/hooks/useWordIntegration');

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    isRTL: false,
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('parseBulkImportLine', () => {
  it('parses the plain word - definition form unchanged', () => {
    expect(parseBulkImportLine('happy - feeling joy')).toEqual({ word: 'happy', definition: 'feeling joy' });
    expect(parseBulkImportLine('happy')).toEqual({ word: 'happy', definition: '' });
  });

  it('parses syn / ant / ex / level segments after pipes', () => {
    expect(
      parseBulkImportLine('happy - feeling joy | syn: glad, cheerful | ant: sad | ex: The ___ dog barked. | level: challenge')
    ).toEqual({
      word: 'happy',
      definition: 'feeling joy',
      synonyms: ['glad', 'cheerful'],
      antonyms: ['sad'],
      example: 'The ___ dog barked.',
      level: 'challenge',
    });
  });

  it('accepts long-form keys, any order, mixed case, and no definition', () => {
    expect(parseBulkImportLine('brave | Example: The brave knight. | Antonyms: cowardly | synonyms: bold')).toEqual({
      word: 'brave',
      definition: '',
      synonyms: ['bold'],
      antonyms: ['cowardly'],
      example: 'The ___ knight.', // blank auto-inserted
    });
  });

  it('ignores unknown segments and bad level values', () => {
    expect(parseBulkImportLine('tiny - very small | colour: blue | level: giant')).toEqual({
      word: 'tiny',
      definition: 'very small',
    });
  });

  it('does not split hyphenated words', () => {
    expect(parseBulkImportLine('well-known - familiar')).toEqual({ word: 'well-known', definition: 'familiar' });
  });
});

describe('BulkImportEnhanced with extra columns', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWordIntegration as jest.Mock).mockReturnValue({
      checkWordIntegration: vi.fn((word: string) => ({ word: word.trim().toLowerCase(), canIntegrate: true })),
    });
  });

  it('imports synonyms, antonyms, examples and level into VocabularyWord', async () => {
    render(<BulkImportEnhanced isOpen onClose={mockOnClose} onImport={mockOnImport} language="en" />);

    const textarea = screen.getByPlaceholderText('teacher.lesson.bulkImportPlaceholder');
    fireEvent.change(textarea, {
      target: {
        value: [
          'happy - feeling joy | syn: glad, cheerful | ant: sad | ex: The ___ dog barked.',
          'brave - not afraid | syn: bold | level: support',
          'plain - just a definition',
        ].join('\n'),
      },
    });

    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));

    await waitFor(() => expect(mockOnImport).toHaveBeenCalled());
    const words = mockOnImport.mock.calls[0][0];
    expect(words[0]).toEqual({
      word: 'happy',
      definition: 'feeling joy',
      canIntegrate: true,
      synonyms: ['glad', 'cheerful'],
      antonyms: ['sad'],
      example: 'The ___ dog barked.',
    });
    expect(words[1]).toEqual({
      word: 'brave',
      definition: 'not afraid',
      canIntegrate: true,
      synonyms: ['bold'],
      level: 'support',
    });
    expect(words[2]).toEqual({ word: 'plain', definition: 'just a definition', canIntegrate: true });
  });

  it('documents the extended format in the helper text', () => {
    render(<BulkImportEnhanced isOpen onClose={mockOnClose} onImport={mockOnImport} language="en" />);
    expect(screen.getByText('teacher.wordDetails.importFormatHelp')).toBeInTheDocument();
  });
});
