import { render, act, waitFor } from '@testing-library/react';
import SoloPracticeBoard from '../SoloPracticeBoard';
import type { VocabularyWord } from '@/lib/supabase/education';

// Use vi.fn() to capture GridComponent props without module-level reassignment
const mockGridComponent = jest.fn<React.JSX.Element, [Record<string, unknown>]>(() => <div data-testid="grid-component" />);

vi.mock('@/components/GridComponent', () => {
  const Wrapped = (props: Record<string, unknown>) => mockGridComponent(props);
  Wrapped.displayName = 'MockGridComponent';
  return { default: Wrapped };
});

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: ({ feedback }: { feedback: { type: string } | null }) => (
    <div data-testid="word-forming-area" data-feedback-type={feedback?.type ?? ''} />
  ),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/utils/utils', () => ({
  generateRandomTable: () => [
    ['T', 'E', 'S', 'T'],
    ['W', 'O', 'R', 'D'],
    ['H', 'E', 'L', 'P'],
    ['G', 'A', 'M', 'E'],
  ],
}));

// Mock clientWordValidator - allow all words through local validation
vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn().mockReturnValue({ isValid: true }),
  isWordOnBoard: vi.fn().mockReturnValue(true),
  buildPositionsMap: vi.fn().mockReturnValue(new Map()),
}));

/** Helper to get the most recent GridComponent props */
function getGridProps() {
  const calls = mockGridComponent.mock.calls;
  return calls[calls.length - 1]?.[0] as Record<string, unknown> | undefined;
}

const mockWords: VocabularyWord[] = [
  { word: 'test', definition: 'a test', canIntegrate: true },
  { word: 'word', definition: 'a word', canIntegrate: true },
];

const defaultProps = {
  lessonName: 'Test Lesson',
  words: mockWords,
  language: 'en' as const,
  onComplete: vi.fn(),
  onBack: vi.fn(),
  onWordFound: vi.fn(),
};

describe('SoloPracticeBoard - Word Feedback & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render WordFormingArea for feedback display', () => {
    // GIVEN: SoloPracticeBoard is rendered
    render(<SoloPracticeBoard {...defaultProps} />);

    // THEN: WordFormingArea should be present (feedback display area)
    const feedbackArea = document.querySelector('[data-testid="word-forming-area"]');
    expect(feedbackArea).toBeInTheDocument();
  });

  it('should validate submitted words against dictionary API', async () => {
    // GIVEN: SoloPracticeBoard is rendered and fetch is mocked
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<SoloPracticeBoard {...defaultProps} />);

    // WHEN: A word is submitted via the grid
    const props = getGridProps();
    const onWordSubmit = props?.onWordSubmit as (word: string) => void;
    expect(onWordSubmit).toBeDefined();
    await act(async () => {
      onWordSubmit('test');
    });

    // THEN: Dictionary API should have been called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dictionary/check',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test'),
        })
      );
    });
  });

  it('should pass onWordChange and hideWordPreview to GridComponent', () => {
    // GIVEN/WHEN: SoloPracticeBoard is rendered
    render(<SoloPracticeBoard {...defaultProps} />);

    // THEN: GridComponent should have onWordChange callback and hideWordPreview
    const props = getGridProps();
    expect(props?.onWordChange).toBeDefined();
    expect(props?.hideWordPreview).toBe(true);
  });

  it('should show accepted feedback when dictionary validates word', async () => {
    // GIVEN: Dictionary API returns valid
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<SoloPracticeBoard {...defaultProps} />);

    // WHEN: Word is submitted and validated
    const onWordSubmit = getGridProps()?.onWordSubmit as (word: string) => void;
    await act(async () => {
      onWordSubmit('test');
    });

    // THEN: WordFormingArea should receive accepted feedback
    await waitFor(() => {
      const tileWord = document.querySelector('[data-testid="word-forming-area"]');
      expect(tileWord).toHaveAttribute('data-feedback-type', 'accepted');
    });
  });

  it('should show rejected feedback when dictionary rejects word', async () => {
    // GIVEN: Dictionary API returns invalid
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: false }),
    });

    render(<SoloPracticeBoard {...defaultProps} />);

    // WHEN: Invalid word is submitted
    const onWordSubmit = getGridProps()?.onWordSubmit as (word: string) => void;
    await act(async () => {
      onWordSubmit('xyz');
    });

    // THEN: WordFormingArea should receive rejected feedback
    await waitFor(() => {
      const tileWord = document.querySelector('[data-testid="word-forming-area"]');
      expect(tileWord).toHaveAttribute('data-feedback-type', 'rejected');
    });
  });
});
