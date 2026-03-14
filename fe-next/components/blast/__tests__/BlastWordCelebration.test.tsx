import { render, screen } from '@testing-library/react';
import { BlastWordCelebration } from '../BlastWordCelebration';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  m: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('BlastWordCelebration', () => {
  const noop = () => {};

  it('renders nothing when celebration is null', () => {
    const { container } = render(
      <BlastWordCelebration celebration={null} onComplete={noop} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders celebration container for tier 1', () => {
    render(
      <BlastWordCelebration
        celebration={{ id: '1', tier: 1, wordLength: 5, word: 'HELLO', position: { x: 100, y: 100 } }}
        onComplete={noop}
      />,
    );
    expect(screen.getByTestId('blast-word-celebration')).toBeInTheDocument();
  });

  it('renders light beam for tier 1+', () => {
    render(
      <BlastWordCelebration
        celebration={{ id: '1', tier: 1, wordLength: 5, word: 'HELLO', position: { x: 100, y: 100 } }}
        onComplete={noop}
      />,
    );
    expect(screen.getByTestId('celebration-light-beam')).toBeInTheDocument();
  });

  it('renders celebration text for tier 2+', () => {
    render(
      <BlastWordCelebration
        celebration={{ id: '2', tier: 2, wordLength: 6, word: 'WORLDS', position: { x: 100, y: 100 } }}
        onComplete={noop}
      />,
    );
    expect(screen.getByTestId('celebration-text')).toBeInTheDocument();
  });

  it('renders tier 3 text', () => {
    render(
      <BlastWordCelebration
        celebration={{ id: '3', tier: 3, wordLength: 7, word: 'EXCITED', position: { x: 100, y: 100 } }}
        onComplete={noop}
      />,
    );
    expect(screen.getByTestId('celebration-text')).toBeInTheDocument();
  });

  it('renders tier 4 with background flash', () => {
    render(
      <BlastWordCelebration
        celebration={{ id: '4', tier: 4, wordLength: 8, word: 'ABSOLUTE', position: { x: 100, y: 100 } }}
        onComplete={noop}
      />,
    );
    expect(screen.getByTestId('celebration-bg-flash')).toBeInTheDocument();
  });
});
