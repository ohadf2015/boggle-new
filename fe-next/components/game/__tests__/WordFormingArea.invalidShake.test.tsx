import { render } from '@testing-library/react';
import WordFormingArea, { type WordFeedback } from '../WordFormingArea';

const captured = vi.hoisted(() => ({ animate: [] as Array<Record<string, unknown>>, transition: [] as Array<Record<string, unknown>>, spans: [] as Array<Record<string, unknown>> }));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, animate, transition }: Record<string, unknown> & { children?: React.ReactNode }) => {
      if (animate && 'x' in (animate as object)) {
        captured.animate.push(animate as Record<string, unknown>);
        captured.transition.push(transition as Record<string, unknown>);
      }
      return <div>{children}</div>;
    },
    span: ({ children, animate }: Record<string, unknown> & { children?: React.ReactNode }) => {
      captured.spans.push(animate as Record<string, unknown>);
      return <span>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div /> }));

const rejected: WordFeedback = { id: 'r1', type: 'rejected', word: 'XQZ', timestamp: Date.now() };

describe('WordFormingArea invalid-word shake', () => {
  it('shakes +-6px over under 300ms and does not wobble the icon', () => {
    render(<WordFormingArea word="" letterCount={0} feedback={rejected} compact />);
    const x = captured.animate.at(-1)!.x as number[];
    expect(Math.max(...x.map(Math.abs))).toBe(6);
    expect((captured.transition.at(-1)!.x as { duration: number }).duration).toBeLessThanOrEqual(0.3);
    expect(captured.spans.some((a) => Array.isArray(a?.rotate))).toBe(false);
  });
});
