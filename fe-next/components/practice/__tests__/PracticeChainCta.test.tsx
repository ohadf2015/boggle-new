/**
 * PracticeChainCta routes the player from a finished practice mode to the next
 * mode in the playlist. After the last mode (`wheelRush`) it sends them back to
 * the practice hub instead of dead-ending.
 *
 * Also fires telemetry + plays click sound + haptic so the chain feels like a
 * deliberate handoff, not a flat link.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    __loaded: true,
  },
}));

const playButtonClickSoundMock = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: playButtonClickSoundMock }),
}));

const tapMock = vi.fn();
vi.mock('@/utils/haptics', () => ({
  haptics: { tap: () => tapMock() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));

import PracticeChainCta from '../PracticeChainCta';

beforeEach(() => {
  captureMock.mockClear();
  playButtonClickSoundMock.mockClear();
  tapMock.mockClear();
});

describe('PracticeChainCta', () => {
  it('links to the next mode in the playlist when one exists', () => {
    render(<PracticeChainCta currentMode="classic" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/he/daily/word-hunt?practice=1');
    expect(link.textContent).toMatch(/practice\.continueTo\.wordHunt/);
  });

  it('links from wordHunt to wheelRush', () => {
    render(<PracticeChainCta currentMode="wordHunt" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/he/daily/word-wheel?practice=1');
  });

  it('routes home with an "all done" label after the last mode', () => {
    render(<PracticeChainCta currentMode="wheelRush" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/he');
    expect(link.textContent).toMatch(/practice\.allDone/);
  });

  it('renders 3 progress dots — one per mode in the chain', () => {
    render(<PracticeChainCta currentMode="classic" />);
    const dots = screen.getAllByTestId(/practice-chain-dot-/);
    expect(dots).toHaveLength(3);
  });

  it('marks the just-completed mode as "done" and the next mode as "current"', () => {
    render(<PracticeChainCta currentMode="wordHunt" />);
    expect(screen.getByTestId('practice-chain-dot-classic')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('practice-chain-dot-wordHunt')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('practice-chain-dot-wheelRush')).toHaveAttribute('data-state', 'next');
  });

  it('marks all dots as "done" when the chain is complete', () => {
    render(<PracticeChainCta currentMode="wheelRush" />);
    expect(screen.getByTestId('practice-chain-dot-classic')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('practice-chain-dot-wordHunt')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('practice-chain-dot-wheelRush')).toHaveAttribute('data-state', 'done');
  });

  it('plays click sound + fires haptic on tap', () => {
    render(<PracticeChainCta currentMode="classic" />);
    fireEvent.click(screen.getByRole('link'));
    expect(playButtonClickSoundMock).toHaveBeenCalled();
    expect(tapMock).toHaveBeenCalled();
  });

  it('fires practice_chain_clicked telemetry with from-mode + to-mode', () => {
    render(<PracticeChainCta currentMode="classic" />);
    fireEvent.click(screen.getByRole('link'));
    expect(captureMock).toHaveBeenCalledWith('practice_chain_clicked', {
      from_mode: 'classic',
      to_mode: 'wordHunt',
    });
  });

  it('sends to_mode null when the chain is complete', () => {
    render(<PracticeChainCta currentMode="wheelRush" />);
    fireEvent.click(screen.getByRole('link'));
    expect(captureMock).toHaveBeenCalledWith('practice_chain_clicked', {
      from_mode: 'wheelRush',
      to_mode: null,
    });
  });
});
