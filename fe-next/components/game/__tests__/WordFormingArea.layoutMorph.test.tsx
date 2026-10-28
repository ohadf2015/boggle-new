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

describe('WordFormingArea layout morph', () => {
  it('morphs its width by default', () => {
    render(<WordFormingArea word="CAT" letterCount={3} />);
    expect(screen.getByText('CAT').closest('[data-layout]')).toHaveAttribute('data-layout', 'on');
  });

  it('can skip layout projection so a busy game screen is not re-measured on every render', () => {
    render(<WordFormingArea word="CAT" letterCount={3} morphLayout={false} />);
    expect(screen.getByText('CAT').closest('[data-layout]')).toHaveAttribute('data-layout', 'off');
  });
});
