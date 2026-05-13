import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlastFtueOverlay } from '../BlastFtueOverlay';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

describe('BlastFtueOverlay', () => {
  it('renders step 1 with intro text and dismiss CTA', () => {
    render(<BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} />);
    expect(screen.getByText('Drag across letters to spell a word')).toBeInTheDocument();
    expect(screen.getByText('Tap to begin')).toBeInTheDocument();
  });

  it('advances to step 2 (coach mark) on pointerdown', async () => {
    const onStepChange = vi.fn();
    render(
      <BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} onStepChange={onStepChange} />
    );

    fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));

    await waitFor(() => {
      expect(screen.getByText('Try it: drag from C to T')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ftue-coach-step-2')).toBeInTheDocument();
  });

  it('coach mark wrapper is pointer-events-none so the board stays interactive', async () => {
    render(<BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} />);
    fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));
    const wrapper = await screen.findByTestId('ftue-coach-step-2');
    expect(wrapper.className).toContain('pointer-events-none');
  });

  it('advances step 2 → 3 when selectionActive becomes true', async () => {
    const { rerender } = render(
      <BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} selectionActive={false} />
    );
    fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));
    await screen.findByText('Try it: drag from C to T');

    rerender(<BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} selectionActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('Letters above fall to fill the space')).toBeInTheDocument();
    });
  });

  it('advances step 4 → 5 → 6 as wordsFoundCount increases', async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <BlastFtueOverlay onComplete={vi.fn()} isVeteran={false} selectionActive={true} />
      );
      fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));
      // selectionActive=true → step 3 (cascade hint), auto-advances after 1.8s
      await waitFor(() =>
        expect(screen.getByText('Letters above fall to fill the space')).toBeInTheDocument()
      );
      vi.advanceTimersByTime(2000);
      await waitFor(() =>
        expect(screen.getByText('Find 3 ANIMAL words')).toBeInTheDocument()
      );

      rerender(
        <BlastFtueOverlay
          onComplete={vi.fn()}
          isVeteran={false}
          selectionActive={true}
          wordsFoundCount={1}
        />
      );
      await waitFor(() =>
        expect(
          screen.getByText('Or tap each letter, double-tap to confirm')
        ).toBeInTheDocument()
      );

      rerender(
        <BlastFtueOverlay
          onComplete={vi.fn()}
          isVeteran={false}
          selectionActive={true}
          wordsFoundCount={2}
        />
      );
      await waitFor(() =>
        expect(screen.getByText('Level 1! Watch your chest bar →')).toBeInTheDocument()
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls onComplete at step 6 when levelComplete flips true', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    try {
      const { rerender } = render(
        <BlastFtueOverlay
          onComplete={onComplete}
          isVeteran={false}
          selectionActive={true}
          wordsFoundCount={2}
        />
      );
      fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));
      vi.advanceTimersByTime(2000);
      await waitFor(() =>
        expect(screen.getByText('Level 1! Watch your chest bar →')).toBeInTheDocument()
      );

      rerender(
        <BlastFtueOverlay
          onComplete={onComplete}
          isVeteran={false}
          selectionActive={true}
          wordsFoundCount={2}
          levelComplete={true}
        />
      );
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
    } finally {
      vi.useRealTimers();
    }
  });

  it('skip button dismisses the tutorial', async () => {
    const onComplete = vi.fn();
    render(<BlastFtueOverlay onComplete={onComplete} isVeteran={false} />);
    fireEvent.pointerDown(screen.getByText('Drag across letters to spell a word'));
    const skip = await screen.findByTestId('ftue-skip');
    fireEvent.click(skip);
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows veteran welcome message when isVeteran=true', () => {
    render(<BlastFtueOverlay onComplete={vi.fn()} isVeteran={true} />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    expect(
      screen.getByText('Blast has been redesigned. Enjoy the new levels!')
    ).toBeInTheDocument();
  });

  it('calls onComplete when veteran dismisses', () => {
    const onComplete = vi.fn();
    render(<BlastFtueOverlay onComplete={onComplete} isVeteran={true} />);
    fireEvent.click(screen.getByText("Let's go"));
    expect(onComplete).toHaveBeenCalled();
  });
});
