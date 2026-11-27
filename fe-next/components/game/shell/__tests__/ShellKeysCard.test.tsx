import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShellKeysCard } from '../ShellKeysCard';

const t = (k: string) => k;

describe('ShellKeysCard', () => {
  it('given spare rail height, when rendered, then a decorative mascot fills it above the keys', () => {
    render(<ShellKeysCard t={t} />);
    const mascot = screen.getByTestId('shell-mascot');
    expect(mascot.getAttribute('aria-hidden')).toBe('true');
    expect(mascot.compareDocumentPosition(screen.getByTestId('shell-keys')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a host mascot stage, the idle sprite steps aside while a gag plays in its spot', () => {
    let stage: HTMLDivElement | null = null;
    render(<ShellKeysCard t={t} mascotStageRef={(el) => { stage = el; }} />);
    const spot = screen.getByTestId('shell-mascot');
    expect(stage).toBe(spot);
    expect(spot.className).toContain('relative');
    expect(spot.className).toContain('[&:has([data-mascot-stage-layer])>img]:invisible');
  });

  describe('compact (game rails): keyboard help shows on the first game only, as a small hint', () => {
    afterEach(() => localStorage.clear());

    it('first game: a one-line keyboard hint, not the full keys card', () => {
      render(<ShellKeysCard t={t} compact />);
      expect(screen.getByTestId('shell-keys-hint')).toHaveTextContent('gameShell.keys.title');
      expect(screen.queryByTestId('shell-keys')).toBeNull();
    });

    it('returning player: no keyboard help at all, the mascot keeps the rail', () => {
      localStorage.setItem('lexiclash_first_game_played', '1');
      render(<ShellKeysCard t={t} compact />);
      expect(screen.queryByTestId('shell-keys-hint')).toBeNull();
      expect(screen.queryByTestId('shell-keys')).toBeNull();
      expect(screen.getByTestId('shell-mascot')).toBeInTheDocument();
    });
  });
});
