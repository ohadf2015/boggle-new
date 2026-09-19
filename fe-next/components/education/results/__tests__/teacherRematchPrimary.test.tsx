/**
 * Teacher post-game primary actions: "Rematch" as LOUD PRIMARY, "View Report" as secondary.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock setup - all vi.mock calls are hoisted
vi.mock('@/lib/analytics/lazyPosthog', () => {
  const mockCapture = vi.fn();
  return {
    default: {
      capture: mockCapture,
    },
    mockCapture,
  };
});

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: vi.fn(() => ({
    hasPro: true,
    loading: false,
  })),
}));

import { ResultsPrimaryActions } from '../ResultsPrimaryActions';
import posthog from '@/lib/analytics/lazyPosthog';

describe('Teacher rematch primary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual hierarchy', () => {
    it('renders Rematch as full-width primary button', () => {
      const onRematch = vi.fn();
      render(
        <ResultsPrimaryActions
          language="en"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const rematchBtn = screen.getByTestId('rematch-same-list');
      expect(rematchBtn).toBeInTheDocument();
      expect(rematchBtn.className).toContain('bg-neo-yellow');
      expect(rematchBtn.className).toContain('font-bold');
    });

    it('renders View Report as secondary button below Rematch', () => {
      const onRematch = vi.fn();
      render(
        <ResultsPrimaryActions
          language="en"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const reportLink = screen.getByTestId('full-report-link');
      expect(reportLink).toBeInTheDocument();
      expect(reportLink.className).toContain('bg-neo-cyan');
    });

    it('does not use sm:grid-cols-2 layout (should be stacked)', () => {
      const onRematch = vi.fn();
      render(
        <ResultsPrimaryActions
          language="en"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const container = screen.getByTestId('rematch-same-list').parentElement;
      // Should NOT have the side-by-side layout
      expect(container?.className).not.toMatch(/\bsm:grid-cols-2\b/);
      // Should be flex column (stacked)
      expect(container?.className).toContain('flex-col');
    });
  });

  describe('Rematch rendering', () => {
    it('renders Rematch button immediately (not gated on Pro)', () => {
      const onRematch = vi.fn();
      render(
        <ResultsPrimaryActions
          language="en"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const rematchBtn = screen.getByTestId('rematch-same-list');
      expect(rematchBtn).toBeInTheDocument();
      expect(rematchBtn).not.toBeDisabled();
      expect(rematchBtn).toBeVisible();
    });

    it('hides Rematch when onRematch callback is not provided', () => {
      render(
        <ResultsPrimaryActions
          language="en"
          t={(k) => k}
        />
      );

      const rematchBtn = screen.queryByTestId('rematch-same-list');
      expect(rematchBtn).not.toBeInTheDocument();
    });
  });

  describe('View Report rendering (Pro gate)', () => {
    it('shows View Report link with correct href', () => {
      const onRematch = vi.fn();
      render(
        <ResultsPrimaryActions
          language="fr"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const reportLink = screen.getByTestId('full-report-link');
      expect(reportLink).toHaveAttribute('href', '/fr/teacher/reports');
    });
  });

  describe('PostHog event tracking', () => {
    it('fires results_primary_action_clicked with action=rematch when Rematch is clicked', async () => {
      const onRematch = vi.fn();
      const user = userEvent.setup();

      render(
        <ResultsPrimaryActions
          language="en"
          onRematch={onRematch}
          t={(k) => k}
        />
      );

      const rematchBtn = screen.getByTestId('rematch-same-list');
      await user.click(rematchBtn);

      expect(posthog.capture).toHaveBeenCalledWith(
        'results_primary_action_clicked',
        expect.objectContaining({
          action: 'rematch',
        })
      );
      expect(onRematch).toHaveBeenCalled();
    });

    it('fires results_primary_action_clicked with action=view_report when Report is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ResultsPrimaryActions
          language="en"
          t={(k) => k}
        />
      );

      const reportLink = screen.getByTestId('full-report-link');
      await user.click(reportLink);

      expect(posthog.capture).toHaveBeenCalledWith(
        'results_primary_action_clicked',
        expect.objectContaining({
          action: 'view_report',
        })
      );
    });
  });
});
