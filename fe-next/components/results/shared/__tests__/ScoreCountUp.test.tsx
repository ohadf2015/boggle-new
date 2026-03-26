import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { ScoreCountUp } from '../ScoreCountUp';
import { useReducedMotion } from 'framer-motion';

const mockUseReducedMotion = useReducedMotion as vi.Mock;

describe('ScoreCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the final score in aria-label for accessibility', () => {
    render(<ScoreCountUp to={4820} />);
    const el = screen.getByLabelText('Score: 4820');
    expect(el).toBeInTheDocument();
  });

  it('starts from 0 by default', () => {
    render(<ScoreCountUp to={100} />);
    const el = screen.getByLabelText('Score: 100');
    expect(el.textContent).toBe('0');
  });

  it('starts from custom value when provided', () => {
    render(<ScoreCountUp to={100} from={50} />);
    const el = screen.getByLabelText('Score: 100');
    expect(el.textContent).toBe('50');
  });

  it('skips animation and shows final value when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<ScoreCountUp to={4820} />);
    const el = screen.getByLabelText('Score: 4820');
    expect(el.textContent).toBe('4,820');
  });

  it('applies custom className', () => {
    render(<ScoreCountUp to={100} className="text-6xl font-black" />);
    const el = screen.getByLabelText('Score: 100');
    expect(el.className).toContain('text-6xl');
    expect(el.className).toContain('font-black');
  });

  it('formats numbers with locale separators', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<ScoreCountUp to={12345} />);
    const el = screen.getByLabelText('Score: 12345');
    // toLocaleString should add comma: 12,345
    expect(el.textContent).toBe('12,345');
  });

  it('has aria-live polite for screen reader updates', () => {
    render(<ScoreCountUp to={100} />);
    const el = screen.getByLabelText('Score: 100');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});
