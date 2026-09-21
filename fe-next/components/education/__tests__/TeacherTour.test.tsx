import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', isRTL: false }),
}));

import { TeacherTourDialog } from '../tour/TeacherTourDialog';

describe('TeacherTourDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
