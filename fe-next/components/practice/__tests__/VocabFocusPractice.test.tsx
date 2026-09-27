/**
 * VocabFocusPractice — one 4-choice question at a time, immediate feedback,
 * progress bar, results card, completion callback.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VocabFocusPractice } from '../VocabFocusPractice';
import { buildFocusQuestions } from '@/lib/education/vocabFocus';
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

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: ({ correct, total, onRestart, onBack }: any) => (
    <div data-testid="practice-results-card">
      <div data-testid="results-score">{correct} / {total}</div>
      <button onClick={onRestart} data-testid="restart-button">Try Again</button>
      <button onClick={onBack} data-testid="back-button">Back</button>
    </div>
  ),
}));

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({ word, canIntegrate: true, ...extra });

const words: VocabularyWord[] = [
  w('happy', { definition: 'feeling joy', synonyms: ['glad'], antonyms: ['sad'], example: 'The ___ dog wagged its tail.' }),
  w('brave', { definition: 'not afraid', synonyms: ['bold'], antonyms: ['cowardly'], example: 'The ___ knight faced the dragon.' }),
  w('quick', { definition: 'moving fast', synonyms: ['fast'], antonyms: ['slow'], example: 'A ___ rabbit ran by.' }),
  w('tiny', { definition: 'very small', synonyms: ['little'], antonyms: ['huge'], example: 'A ___ ant crawled up.' }),
  w('loud', { definition: 'making noise', synonyms: ['noisy'], antonyms: ['quiet'], example: 'The ___ drum woke everyone.' }),
];

const SEED = 123;
const COUNT = 3;

describe('VocabFocusPractice', () => {
  const onComplete = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  const renderIt = (focus: 'definition' | 'synonym' | 'antonym' | 'context' = 'synonym') =>
    render(
      <VocabFocusPractice words={words} focus={focus} onComplete={onComplete} onBack={onBack} questionCount={COUNT} seed={SEED} />
    );

  const expected = (focus: 'definition' | 'synonym' | 'antonym' | 'context') =>
    buildFocusQuestions(words, focus, { count: COUNT, seed: SEED });

  it('renders the focus title, the first prompt, four big choices and a progress bar', () => {
    renderIt('synonym');
    const [q1] = expected('synonym');

    expect(screen.getByText('education.vocabFocus.focus.synonym')).toBeInTheDocument();
    expect(screen.getByText('education.vocabFocus.instructions.synonym')).toBeInTheDocument();
    expect(screen.getByTestId('focus-prompt')).toHaveTextContent(q1.prompt);

    const choices = within(screen.getByTestId('focus-choices')).getAllByRole('button');
    expect(choices).toHaveLength(4);
    expect(choices.map((b) => b.textContent)).toEqual(q1.choices);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', String(COUNT));
    expect(screen.getByText(`education.vocabFocus.progress|current=1,total=${COUNT}`)).toBeInTheDocument();
  });

  it('context focus shows the sentence with the blank', () => {
    renderIt('context');
    const [q1] = expected('context');
    expect(screen.getByTestId('focus-prompt')).toHaveTextContent('___');
    expect(screen.getByTestId('focus-prompt')).toHaveTextContent(q1.prompt);
  });

  it('correct answer → green feedback with the definition, then Next advances', () => {
    renderIt('synonym');
    const [q1, q2] = expected('synonym');

    const choices = within(screen.getByTestId('focus-choices')).getAllByRole('button');
    fireEvent.click(choices[q1.answerIndex]);

    const feedback = screen.getByTestId('focus-feedback');
    expect(feedback).toHaveAttribute('data-result', 'correct');
    expect(within(feedback).getByText('education.vocabFocus.correct')).toBeInTheDocument();
    expect(within(feedback).getByText(q1.definition!)).toBeInTheDocument();
    // choices lock once answered
    choices.forEach((b) => expect(b).toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: 'education.vocabFocus.next' }));
    expect(screen.getByTestId('focus-prompt')).toHaveTextContent(q2.prompt);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('wrong answer → shows the right answer', () => {
    renderIt('antonym');
    const [q1] = expected('antonym');
    const choices = within(screen.getByTestId('focus-choices')).getAllByRole('button');
    const wrongIndex = (q1.answerIndex + 1) % 4;
    fireEvent.click(choices[wrongIndex]);

    const feedback = screen.getByTestId('focus-feedback');
    expect(feedback).toHaveAttribute('data-result', 'wrong');
    expect(within(feedback).getByText('education.vocabFocus.wrong')).toBeInTheDocument();
    expect(within(feedback).getByText(`education.vocabFocus.answerWas|answer=${q1.answer}`)).toBeInTheDocument();
    expect(choices[q1.answerIndex]).toHaveAttribute('data-state', 'correct');
    expect(choices[wrongIndex]).toHaveAttribute('data-state', 'wrong');
  });

  it('after the last question shows results and reports the session once', () => {
    renderIt('definition');
    const qs = expected('definition');

    qs.forEach((q, i) => {
      const choices = within(screen.getByTestId('focus-choices')).getAllByRole('button');
      // answer first two right, last one wrong
      fireEvent.click(choices[i < 2 ? q.answerIndex : (q.answerIndex + 1) % 4]);
      fireEvent.click(screen.getByRole('button', { name: i === qs.length - 1 ? 'education.vocabFocus.finish' : 'education.vocabFocus.next' }));
    });

    expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
    expect(screen.getByTestId('results-score')).toHaveTextContent(`2 / ${COUNT}`);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ correct: 2, total: COUNT, accuracy: 2 / COUNT, focus: 'definition' });
  });

  it('Try Again restarts with a fresh question set', () => {
    renderIt('synonym');
    const qs = expected('synonym');
    qs.forEach((q, i) => {
      fireEvent.click(within(screen.getByTestId('focus-choices')).getAllByRole('button')[q.answerIndex]);
      fireEvent.click(screen.getByRole('button', { name: i === qs.length - 1 ? 'education.vocabFocus.finish' : 'education.vocabFocus.next' }));
    });
    fireEvent.click(screen.getByTestId('restart-button'));
    expect(screen.queryByTestId('practice-results-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('focus-prompt')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('explains what is missing when the lesson cannot support the focus', () => {
    render(
      <VocabFocusPractice
        words={[w('a', { synonyms: ['x'] }), w('b'), w('c'), w('d')]}
        focus="synonym"
        onComplete={onComplete}
        onBack={onBack}
      />
    );
    expect(screen.getByText('education.vocabFocus.notEnough.synonym')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(onBack).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
