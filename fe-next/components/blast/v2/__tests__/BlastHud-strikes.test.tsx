import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MusicProviderStub } from '@/contexts/MusicContext';
import { BlastHud } from '../BlastHud';

// BlastHud mounts BlastHudMuteButton (useMasterMute -> useMusic), so every
// bare render needs the music stub.
const render = (ui: ReactElement) => rtlRender(<MusicProviderStub>{ui}</MusicProviderStub>);

const base = {
  levelNumber: 8,
  coins: 0,
  chestProgress: 0,
  onShuffle: vi.fn(),
  onHint: vi.fn(),
};

describe('BlastHud — strike indicator', () => {
  it('shows remaining guesses as pips when a strike budget is active', () => {
    render(<BlastHud {...base} strikeBudget={5} strikesUsed={2} />);
    const strikes = screen.getByTestId('hud-strikes');
    expect(strikes).toHaveAttribute('data-remaining', '3');
    const pips = strikes.querySelectorAll('[data-pip]');
    expect(pips.length).toBe(5);
    expect(strikes.querySelectorAll('[data-spent="true"]').length).toBe(2);
  });

  it('renders NOTHING when the level has no strike budget (early/chill levels)', () => {
    render(<BlastHud {...base} strikeBudget={null} strikesUsed={0} />);
    expect(screen.queryByTestId('hud-strikes')).not.toBeInTheDocument();
  });

  it('omits the indicator entirely when strike props are not supplied', () => {
    render(<BlastHud {...base} />);
    expect(screen.queryByTestId('hud-strikes')).not.toBeInTheDocument();
  });

  it('flags the danger state when only one guess remains', () => {
    render(<BlastHud {...base} strikeBudget={5} strikesUsed={4} />);
    const strikes = screen.getByTestId('hud-strikes');
    expect(strikes).toHaveAttribute('data-remaining', '1');
    expect(strikes).toHaveAttribute('data-danger', 'true');
  });
});
