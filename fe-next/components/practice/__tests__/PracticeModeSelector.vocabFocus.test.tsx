/**
 * PracticeModeSelector — "Vocabulary focus" card with per-focus sub-choices.
 * Focuses the lesson cannot support are shown disabled with an unlock hint.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PracticeModeSelector from '../PracticeModeSelector';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const Passthrough = (tag: string) => {
    const C = ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, ...props }: any) => {
      const Tag = tag as any;
      return <Tag {...props}>{children}</Tag>;
    };
    C.displayName = `Mock.${tag}`;
    return C;
  };
  return {
    AdaptiveMotion: { div: Passthrough('div'), span: Passthrough('span'), button: Passthrough('button'), p: Passthrough('p') },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({ word, canIntegrate: true, ...extra });

// definitions on 4 words (unlocked), synonyms on 2 (locked), no antonyms/examples
const words: VocabularyWord[] = [
  w('a', { definition: 'da', synonyms: ['x'] }),
  w('b', { definition: 'db', synonyms: ['y'] }),
  w('c', { definition: 'dc' }),
  w('d', { definition: 'dd' }),
];

const baseProps = {
  lessonName: 'Unit 3',
  wordCount: 4,
  progress: { mastery: 'started' as const, progress: null },
  onBack: vi.fn(),
};

describe('PracticeModeSelector — vocabulary focus', () => {
  const onSelectMode = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it('renders the Vocabulary focus card with four sub-choices', () => {
    render(<PracticeModeSelector {...baseProps} words={words} onSelectMode={onSelectMode} />);
    const card = screen.getByTestId('practice-mode-vocab_focus');
    expect(within(card).getByText('education.vocabFocus.title')).toBeInTheDocument();
    expect(within(card).getByText('education.vocabFocus.desc')).toBeInTheDocument();
    for (const focus of ['definition', 'synonym', 'antonym', 'context']) {
      expect(within(card).getByRole('button', { name: new RegExp(`education.vocabFocus.focus.${focus}`) })).toBeInTheDocument();
    }
  });

  it('enabled focus starts vocab_focus with that focus; disabled ones show the unlock hint', () => {
    render(<PracticeModeSelector {...baseProps} words={words} onSelectMode={onSelectMode} />);
    const card = screen.getByTestId('practice-mode-vocab_focus');

    const definition = within(card).getByRole('button', { name: /education.vocabFocus.focus.definition/ });
    expect(definition).toBeEnabled();
    fireEvent.click(definition);
    expect(onSelectMode).toHaveBeenCalledWith('vocab_focus', { focus: 'definition' });

    const synonym = within(card).getByRole('button', { name: /education.vocabFocus.focus.synonym/ });
    expect(synonym).toBeDisabled();
    expect(within(card).getByText('education.vocabFocus.unlock.synonym|min=4')).toBeInTheDocument();
    fireEvent.click(synonym);
    expect(onSelectMode).toHaveBeenCalledTimes(1);
  });

  it('clicking the card body does not start a session without a focus', () => {
    render(<PracticeModeSelector {...baseProps} words={words} onSelectMode={onSelectMode} />);
    fireEvent.click(screen.getByText('education.vocabFocus.title'));
    expect(onSelectMode).not.toHaveBeenCalled();
  });

  it('still starts classic modes with no focus argument', () => {
    render(<PracticeModeSelector {...baseProps} words={words} onSelectMode={onSelectMode} />);
    fireEvent.click(screen.getByText('education.practice.flashcards'));
    expect(onSelectMode).toHaveBeenCalledWith('flashcard');
  });

  it('hides the focus card entirely when no words are given', () => {
    render(<PracticeModeSelector {...baseProps} onSelectMode={onSelectMode} />);
    expect(screen.queryByTestId('practice-mode-vocab_focus')).not.toBeInTheDocument();
  });
});
