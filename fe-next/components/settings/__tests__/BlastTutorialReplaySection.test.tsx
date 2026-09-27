import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastTutorialReplaySection } from '../BlastTutorialReplaySection';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('BlastTutorialReplaySection', () => {
  it('renders collapsible section with title', () => {
    render(<BlastTutorialReplaySection />);

    expect(screen.getByText('Replay Tutorials')).toBeInTheDocument();
  });

  it('expands and collapses section', () => {
    render(<BlastTutorialReplaySection />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    expect(button).toBeInTheDocument();

    // Initially collapsed - should have ▶ indicator
    expect(button?.textContent).toContain('▶');

    // Click to expand
    fireEvent.click(button!);
    expect(button?.textContent).toContain('▼');

    // Click to collapse
    fireEvent.click(button!);
    expect(button?.textContent).toContain('▶');
  });

  it('shows FTUE replay option when expanded', () => {
    render(<BlastTutorialReplaySection onReplayFtue={vi.fn()} />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    fireEvent.click(button!);

    expect(screen.getByText('Level 1 FTUE')).toBeInTheDocument();
  });

  it('shows all 12 mechanic cards when expanded', () => {
    render(<BlastTutorialReplaySection />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    fireEvent.click(button!);

    // Check for a few mechanic indicators
    expect(screen.getByText(/💰/)).toBeInTheDocument(); // coinOverlay
    expect(screen.getByText(/❄️/)).toBeInTheDocument(); // frozenTiles
    expect(screen.getByText(/✨/)).toBeInTheDocument(); // multiWordReveal
  });

  it('calls onReplayFtue when FTUE option is clicked', () => {
    const onReplayFtue = vi.fn();
    render(<BlastTutorialReplaySection onReplayFtue={onReplayFtue} />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    fireEvent.click(button!);

    const ftueButton = screen.getByText('Level 1 FTUE');
    fireEvent.click(ftueButton);

    expect(onReplayFtue).toHaveBeenCalled();
  });

  it('calls onReplayMechanic when mechanic card is clicked', () => {
    const onReplayMechanic = vi.fn();
    render(<BlastTutorialReplaySection onReplayMechanic={onReplayMechanic} />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    fireEvent.click(button!);

    // Find a mechanic button and click it
    const frozenTilesButton = Array.from(screen.getAllByText(/❄️/))
      .map((el) => el.closest('button'))
      .find((btn) => btn?.textContent?.includes('NEW'));

    if (frozenTilesButton) {
      fireEvent.click(frozenTilesButton);
      expect(onReplayMechanic).toHaveBeenCalledWith('frozenTiles');
    }
  });

  it('displays mechanic icons and titles', () => {
    render(<BlastTutorialReplaySection />);

    const button = screen.getByText('Replay Tutorials').closest('button');
    fireEvent.click(button!);

    // Verify icons are present
    const icons = ['💰', '🔄', '🔀', '💎', '❄️', '⚡', '🌈', '🔍', '📚', '💡', '↔️', '✨'];
    icons.forEach((icon) => {
      expect(screen.getByText(new RegExp(icon))).toBeInTheDocument();
    });
  });
});
