import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLanguage } from '@/contexts/LanguageContext';

vi.mock('@/contexts/LanguageContext');

import { TeacherTourDialog } from '../tour/TeacherTourDialog';

describe('TeacherTourDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (useLanguage as any).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      isRTL: false,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the button', () => {
    render(<TeacherTourDialog />);
    expect(screen.getByTestId('tour-button')).toBeInTheDocument();
    expect(screen.getByText('education.tour.watchButton')).toBeInTheDocument();
  });

  it('opens the dialog when button is clicked', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-dialog')).toBeInTheDocument();
    });
  });

  it('shows scene 1 when dialog opens', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });
  });

  it('advances to next scene', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tour-next'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-2')).toBeInTheDocument();
    });
  });

  it('goes back to previous scene', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tour-next'));
    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tour-previous'));
    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });
  });

  it('jumps to scene via progress bar', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tour-progress-3'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-3')).toBeInTheDocument();
    });
  });

  it('has pause and play buttons', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-pause')).toBeInTheDocument();
    });
  });

  it('shows final CTA on last scene', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    // Navigate to scene 5
    for (let i = 0; i < 4; i++) {
      await waitFor(() => {
        const nextBtn = screen.queryByTestId('tour-next');
        if (nextBtn) fireEvent.click(nextBtn);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-5')).toBeInTheDocument();
      expect(screen.getByTestId('tour-final-cta')).toBeInTheDocument();
    });
  });

  it('closes dialog', async () => {
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tour-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('tour-dialog')).not.toBeInTheDocument();
    });
  });
});

describe('TeacherTourDialog - Accessibility & i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('dialog should have accessible title', async () => {
    (useLanguage as any).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      isRTL: false,
    });

    render(<TeacherTourDialog />);
    // Use testid to open dialog
    const button = screen.getByTestId('tour-button');
    fireEvent.click(button);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });

  it('should not render hardcoded English strings in scenes', async () => {
    (useLanguage as any).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      isRTL: false,
    });

    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-scene-1')).toBeInTheDocument();
    });

    // Hardcoded English strings that should NOT appear
    // (Decorative names like Alex, Jamie, Morgan are data, not UI text, so they're not checked)
    const hardcodedStrings = [
      'Classroom Name',
      'Language Focus',
      'English Learners',
      'Create Classroom',
      'Share this code with your students',
      '6-character code',
      'Students enter the code on their phones',
      'Students join one by one',
      'Round 1 Results',
      'Full analytics dashboard',
    ];

    for (const str of hardcodedStrings) {
      expect(screen.queryByText(new RegExp(str, 'i'))).not.toBeInTheDocument();
    }
  });

  /**
   * The progress dots' accessible names were a raw English template literal
   * (`Go to scene ${n}`). The visible-text test above cannot see attributes,
   * which is how it survived a fix round — so check the attribute itself.
   */
  it('names the progress segments through t(), not English literals', async () => {
    (useLanguage as any).mockReturnValue({
      t: (key: string, _fallback?: string, params?: Record<string, unknown>) =>
        `X:${key}${params ? ':' + JSON.stringify(params) : ''}`,
      language: 'he',
      isRTL: true,
    });
    render(<TeacherTourDialog />);
    fireEvent.click(screen.getByTestId('tour-button'));
    await waitFor(() => screen.getByRole('dialog'));
    const labels = [...document.querySelectorAll('[role="dialog"] [aria-label]')].map(
      (el) => el.getAttribute('aria-label') ?? '',
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).toMatch(/^X:/);
    }
    expect(labels).toContain('X:education.tour.goToStep:{"n":1}');
  });
});
