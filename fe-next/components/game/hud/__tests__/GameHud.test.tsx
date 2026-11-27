import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameHud, timerTone } from '../GameHud';
import { HUD_FIRE_SLOT } from '@/components/earthquake/FireRoundIndicator';

vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: vi.fn() }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'mute', title: 'mute' }) }));

describe('timerTone: lime, then yellow, then pink as time runs low', () => {
  it.each([
    [60, 60, 'lime'],
    [30, 60, 'lime'],
    [24, 60, 'yellow'],
    [11, 60, 'yellow'],
    [10, 60, 'pink'],
    [0, 60, 'pink'],
    [9, 20, 'pink'],
  ])('%is of %is is %s', (remaining, total, tone) => {
    expect(timerTone(remaining, total)).toBe(tone);
  });
});

describe('GameHud: exit, one timer bar, score pill', () => {
  const base = { onExit: vi.fn(), remaining: 45, total: 60, score: 12 };

  it('renders exit, a progressbar filled to the time left, and the score', () => {
    render(<GameHud {...base} />);
    expect(screen.getByRole('button', { name: 'common.exit' })).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '45');
    expect(bar).toHaveAttribute('aria-valuemax', '60');
    expect(screen.getByTestId('hud-timer-fill').style.transform).toBe('scaleX(0.75)');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('12');
  });

  it('marks the last ten seconds urgent', () => {
    render(<GameHud {...base} remaining={8} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'pink');
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-urgent', 'true');
  });

  it('keeps calm when urgency is suppressed (classroom gentle timer)', () => {
    render(<GameHud {...base} remaining={8} gentle />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-urgent', 'false');
  });

  it('hosts the fire-round slot in the HUD row', () => {
    const { container } = render(<GameHud {...base} />);
    expect(container.querySelector(`[${HUD_FIRE_SLOT}]`)).not.toBeNull();
  });

  it('carries its own mute, so the floating sound button never sits on the HUD', () => {
    render(<GameHud {...base} />);
    expect(screen.getByRole('button', { name: 'mute' })).toBeInTheDocument();
  });

  it('drops the bar when the timer is hidden, and the exit calls back', () => {
    const onExit = vi.fn();
    render(<GameHud {...base} onExit={onExit} remaining={null} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common.exit' }));
    expect(onExit).toHaveBeenCalled();
  });
});
