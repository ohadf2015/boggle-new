import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Pass-through t(); dir is controlled per-test via the mock below.
let mockDir: 'ltr' | 'rtl' = 'ltr';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    dir: mockDir,
    language: 'en',
  }),
}));

import { MPStuckCoachCard } from '../MPStuckCoachCard';

describe('MPStuckCoachCard', () => {
  it('renders nothing when stage is none', () => {
    const { container } = render(
      <MPStuckCoachCard stage="none" onDismiss={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders distinct copy for each stage', () => {
    const stages = ['idle-nudge', 'tap-hint', 'submit-hint', 'validity-hint'] as const;
    const seen = new Set<string>();
    for (const stage of stages) {
      const { unmount } = render(<MPStuckCoachCard stage={stage} onDismiss={() => {}} />);
      const status = screen.getByRole('status');
      expect(status.textContent).toBeTruthy();
      seen.add(status.textContent ?? '');
      unmount();
    }
    // Each stage produces a different message (copy matched to signal).
    expect(seen.size).toBe(stages.length);
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<MPStuckCoachCard stage="tap-hint" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('exposes an aria-live region for screen readers', () => {
    render(<MPStuckCoachCard stage="idle-nudge" onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('mirrors the drag diagram in RTL', () => {
    mockDir = 'rtl';
    const { container } = render(
      <MPStuckCoachCard stage="tap-hint" onDismiss={() => {}} />
    );
    const diagram = container.querySelector('[data-testid="drag-hint-diagram"]');
    expect(diagram).not.toBeNull();
    expect(diagram?.getAttribute('data-dir')).toBe('rtl');
    mockDir = 'ltr';
  });
});
