import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import FlashcardReview from '../FlashcardReview';
import { WordMatchingPractice } from '../WordMatchingPractice';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import { TimedBlitzPractice } from '../TimedBlitzPractice';
import SoloPracticeBoard from '../SoloPracticeBoard';
import WarmupRound from '../WarmupRound';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), isSpeaking: false }),
}));
vi.mock('../PronunciationButton', () => ({ PronunciationButton: () => null }));
vi.mock('../FlashcardSwipeStack', () => ({ FlashcardSwipeStack: () => <div /> }));
vi.mock('../WordContextRow', () => ({ WordContextRow: () => null }));
vi.mock('@/components/GridComponent', () => ({ default: () => <div data-testid="grid-component" /> }));
vi.mock('@/components/game/WordFormingArea', () => ({ default: () => <div /> }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => null }));
vi.mock('@/lib/education/practiceBoard', () => ({
  generatePlayablePracticeBoard: () => null,
}));

vi.mock('framer-motion', () => {
  const Passthrough = ({ children, ...props }: { children?: React.ReactNode }) => (
    <div {...props}>{children}</div>
  );
  return {
    m: { div: Passthrough, span: Passthrough, button: Passthrough, p: Passthrough },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const Passthrough = ({ children, ...props }: { children?: React.ReactNode }) => (
    <div {...props}>{children}</div>
  );
  return {
    AdaptiveMotion: { div: Passthrough, span: Passthrough, button: Passthrough, p: Passthrough },
    AdaptiveAnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useSensors: vi.fn(() => []),
  useSensor: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));
vi.mock('@dnd-kit/sortable', () => ({ sortableKeyboardCoordinates: vi.fn() }));

const blank: VocabularyWord[] = [
  { word: '  ', canIntegrate: true },
  { word: 'ghost', canIntegrate: true },
];

const oneDefined: VocabularyWord[] = [
  { word: 'apple', definition: 'a fruit', canIntegrate: true },
];

describe('practice drills guard missing data', () => {
  const onBack = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    onBack.mockReset();
    onComplete.mockReset();
  });

  it('flashcards show the insufficient-data panel when no word has a definition', () => {
    render(<FlashcardReview words={blank} onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
    expect(screen.getByText('education.practice.insufficientData.title')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('matching needs at least two defined pairs', () => {
    render(
      <WordMatchingPractice words={oneDefined} onComplete={onComplete} onBack={onBack} />,
    );
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
  });

  /*
    Spelling's minimum is a WORD, not a definition: the drill asks the student
    to hear it and spell it, and the definition is a bonus prompt. Dropping
    undefined words here would have printed the dead-end panel over a live
    eight-word round — see SpellingChallengePractice.hintBlanks.test.tsx. So
    the panel is owed to a list with nothing spellable left in it, and a word
    without a definition must still play.
  */
  it('spelling shows the panel when no spellable word remains', () => {
    render(
      <SpellingChallengePractice
        words={[{ word: '  ', canIntegrate: true }, { word: '', canIntegrate: true }]}
        onComplete={onComplete}
        onBack={onBack}
      />,
    );
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
  });

  it('spelling still plays a word the teacher never defined', () => {
    render(
      <SpellingChallengePractice words={blank} onComplete={onComplete} onBack={onBack} />,
    );
    expect(screen.queryByTestId('practice-insufficient-data')).not.toBeInTheDocument();
    expect(screen.getByTestId('hint-display')).toBeInTheDocument();
  });

  it('blitz shows the panel when no definition remains', () => {
    render(<TimedBlitzPractice words={blank} onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
    expect(screen.queryByTestId('countdown-phase')).not.toBeInTheDocument();
  });

  it('solo board shows the panel when no lesson word can be placed', () => {
    render(
      <SoloPracticeBoard
        lessonName="Week 1"
        words={[{ word: 'unplaceablewordxyz', canIntegrate: true }]}
        language="en"
        onComplete={onComplete}
        onBack={onBack}
      />,
    );
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
  });

  it('warmup shows the panel when no lesson word can be placed', () => {
    render(
      <WarmupRound
        lessonName="Week 1"
        words={[{ word: 'unplaceablewordxyz', canIntegrate: true }]}
        language="en"
        onComplete={onComplete}
        onBack={onBack}
      />,
    );
    expect(screen.getByTestId('practice-insufficient-data')).toBeInTheDocument();
  });
});
