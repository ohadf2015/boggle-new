import { render, screen } from '@testing-library/react';
import WordFormingArea from '../WordFormingArea';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, layout, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div data-layout={layout ? 'on' : 'off'} {...props}>{children}</div>
    ),
    span: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useCosyMode: () => false }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => null }));

describe('WordFormingArea empty state', () => {
  it('is a quiet pill that says what to do, not a faint dashed ghost', () => {
    render(<WordFormingArea word="" letterCount={0} />);
    const pill = screen.getByTestId('word-forming-empty');
    expect(pill).toHaveTextContent('game.wordChipEmpty');
    expect(pill.className).not.toContain('border-dashed');
  });
});
