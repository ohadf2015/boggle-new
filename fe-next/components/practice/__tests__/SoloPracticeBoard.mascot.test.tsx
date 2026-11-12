import type { Mock } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import SoloPracticeBoard from '../SoloPracticeBoard';
import type { VocabularyWord } from '@/lib/supabase/education';

// Use vi.fn() to capture GridComponent props without module-level reassignment
const mockGridComponent = vi.fn<React.JSX.Element, [Record<string, unknown>]>(() => <div data-testid="grid-component" />);

vi.mock('@/components/GridComponent', () => {
  const Wrapped = (props: Record<string, unknown>) => mockGridComponent(props);
  Wrapped.displayName = 'MockGridComponent';
  return { default: Wrapped };
});

// The board sizes itself by measuring its container; jsdom reports 0x0, so
// pin a fixed size to keep GridComponent mounted.
vi.mock('@/hooks/useContainerDimensions', () => ({
  useContainerDimensions: () => ({
    containerRef: { current: null },
    dimensions: { width: 360, height: 360 },
    isReady: true,
  }),
}));

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

vi.mock('@/lib/education/practiceBoard', () => ({
  generatePlayablePracticeBoard: () => ({
    grid: [
      ['T', 'E', 'S', 'T'],
      ['W', 'O', 'R', 'D'],
      ['H', 'E', 'L', 'P'],
      ['G', 'A', 'M', 'E'],
    ],
    embedded: ['test'],
    seed: 1,
  }),
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

import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

describe('SoloPracticeBoard - mascot reactions', () => {
  let events: MascotEvent[];

  beforeEach(() => {
    vi.clearAllMocks();
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
    global.fetch = vi.fn();
  });

  const submit = async (word: string) => {
    const onWordSubmit = getGridProps()?.onWordSubmit as (w: string) => void;
    await act(async () => {
      onWordSubmit(word);
    });
  };

  it('GIVEN a valid word WHEN it is accepted THEN the mascot hears a word with its length and no word text', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true }) });
    render(<SoloPracticeBoard {...defaultProps} />);
    await submit('test');
    await waitFor(() => expect(events).toContainEqual({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false }));
  });

  it('GIVEN an invalid word WHEN it is rejected THEN the mascot hears a rejection', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: false }) });
    render(<SoloPracticeBoard {...defaultProps} />);
    await submit('xyz');
    await waitFor(() => expect(events).toContainEqual({ kind: 'word-rejected' }));
  });

  it('GIVEN a word already found WHEN it is played again THEN the mascot hears a duplicate, not a rejection', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true, json: async () => ({ isValid: true }) });
    render(<SoloPracticeBoard {...defaultProps} />);
    await submit('test');
    await waitFor(() => expect(events.some((e) => e.kind === 'word-submitted')).toBe(true));
    await submit('test');
    await waitFor(() => expect(events).toContainEqual({ kind: 'duplicate-word' }));
    expect(events).not.toContainEqual({ kind: 'word-rejected' });
  });
});
