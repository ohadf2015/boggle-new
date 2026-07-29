/**
 * GameSidebar Theme Tests
 *
 * Verifies GameSidebar renders with correct default styling.
 */

import { render } from '@testing-library/react';
import { GameSidebar } from '../GameSidebar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('../../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-objectives" />,
}));

describe('GameSidebar — Default Styling', () => {
  const defaultProps = {
    objectives: [],
    hasHintsAvailable: true,
    onHintClick: vi.fn(),
    showAutoHint: false,
    currentHint: null,
    hintLevel: 'none' as const,
  };

  it('should render aside with default neo-navy background', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('bg-neo-navy/60');
  });

  it('should render hint button with neo-yellow when available', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    const activeButtons = Array.from(buttons).filter(b => !b.disabled);
    const hasYellow = activeButtons.some(b => b.className.includes('bg-neo-yellow'));
    expect(hasYellow).toBe(true);
  });

  it('should render hint button as disabled when no hints available', () => {
    const { container } = render(<GameSidebar {...defaultProps} hasHintsAvailable={false} />);
    const buttons = container.querySelectorAll('button');
    const disabledButtons = Array.from(buttons).filter(b => b.disabled);
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('should apply custom className when provided', () => {
    const { container } = render(<GameSidebar {...defaultProps} className="test-class" />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('test-class');
  });
});
