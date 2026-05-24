import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeHubHeader from '@/components/practice/PracticeHubHeader';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, number>) => {
      if (key === 'practice.hub.title') return 'Practice Arena';
      if (key === 'practice.hub.subtitle') return 'Master all 3 modes to unlock the real game';
      if (key === 'practice.hub.progress') {
        return `${params?.count || 0}/${params?.total || 3} complete`;
      }
      return key;
    },
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('PracticeHubHeader', () => {
  it('renders title using translation key', () => {
    render(<PracticeHubHeader completedCount={0} totalCount={3} />);
    expect(screen.getByText('Practice Arena')).toBeInTheDocument();
  });

  it('omits the subtitle — the title + progress bar carry the header without extra copy', () => {
    render(<PracticeHubHeader completedCount={0} totalCount={3} />);
    expect(
      screen.queryByText('Master all 3 modes to unlock the real game')
    ).not.toBeInTheDocument();
  });

  it('renders progress bar with correct width at 1/3', () => {
    const { container } = render(<PracticeHubHeader completedCount={1} totalCount={3} />);
    const progressFill = container.querySelector('[data-testid="progress-fill"]');
    const width = progressFill?.getAttribute('style');
    expect(width).toMatch(/width:\s*33\.33/);
  });

  it('renders progress text "{count}/{total} complete"', () => {
    render(<PracticeHubHeader completedCount={1} totalCount={3} />);
    expect(screen.getByText('1/3 complete')).toBeInTheDocument();
  });

  it('shows 100% width when all modes completed', () => {
    const { container } = render(<PracticeHubHeader completedCount={3} totalCount={3} />);
    const progressFill = container.querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('shows 0% width when no modes completed', () => {
    const { container } = render(<PracticeHubHeader completedCount={0} totalCount={3} />);
    const progressFill = container.querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });
});
