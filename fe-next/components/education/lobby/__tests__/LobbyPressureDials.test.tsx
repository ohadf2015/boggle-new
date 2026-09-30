/**
 * The pressure dials in the lobby — the Pro-gated calm-mode controls.
 *
 * Gate semantics (pitfall class 1): while the entitlement is unresolved the
 * rows are DISABLED — never painted enabled and then yanked when /api/
 * subscription/status comes back free. A free teacher sees the dials frozen
 * on the loud defaults with a Pro lock and an upgrade link, because a control
 * that is invisible cannot be sold.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockTrackGrowthEvent = vi.hoisted(() => vi.fn());
let mockProState = { hasPro: true, loading: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockProState,
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: mockTrackGrowthEvent,
}));

import { LobbyPressureDials } from '../LobbyPressureDials';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';

function setup(overrides: Partial<React.ComponentProps<typeof LobbyPressureDials>> = {}) {
  const onChange = vi.fn();
  render(
    <LobbyPressureDials
      pressure={DEFAULT_CLASSROOM_PRESSURE}
      onChange={onChange}
      {...overrides}
    />
  );
  return { onChange };
}

describe('LobbyPressureDials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProState = { hasPro: true, loading: false };
  });

  it('renders one row per dial with the current values selected', () => {
    setup({ pressure: { leaderboard: 'top3', timer: 'gentle', speedScoring: false } });

    expect(screen.getByTestId('pressure-row-leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('pressure-row-timer')).toBeInTheDocument();
    expect(screen.getByTestId('pressure-row-scoring')).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.leaderboard.top3' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.gentle' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.scoring.accuracy' }))
      .toHaveAttribute('aria-checked', 'true');
  });

  it('emits the flipped dial on choice', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.leaderboard.hidden' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden' });

    fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.off' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CLASSROOM_PRESSURE, timer: 'off' });
  });

  it('maps the scoring row to the boolean speedScoring flag', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.scoring.accuracy' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CLASSROOM_PRESSURE, speedScoring: false });
  });

  it('disables every dial for a free teacher, frozen on the loud defaults, with an upgrade link', () => {
    mockProState = { hasPro: false, loading: false };
    setup({ pressure: { leaderboard: 'hidden', timer: 'off', speedScoring: false } });

    // The lock renders, pointing at the upgrade page.
    const lock = screen.getByTestId('pressure-pro-lock');
    expect(lock).toBeInTheDocument();
    expect(lock.closest('a')).toHaveAttribute('href', '/en/teacher/upgrade');

    // Every choice is disabled — a free teacher cannot set calm mode.
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }

    // …and what is shown frozen is the LOUD default, not the teacher's calm
    // draft — what you see disabled is what the game will run.
    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.leaderboard.full' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.full' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'teacher.classroom.pressure.scoring.speed' }))
      .toHaveAttribute('aria-checked', 'true');
  });

  it('tracks the upsell impression for a free teacher, once', () => {
    mockProState = { hasPro: false, loading: false };
    setup();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { source: 'pro_gate_pressureDials' });
  });

  it('stays disabled while the entitlement is unresolved — never enabled-then-yanked', () => {
    mockProState = { hasPro: true, loading: true };
    setup();

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    // No lock either: a paying teacher must not be told to pay.
    expect(screen.queryByTestId('pressure-pro-lock')).toBeNull();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });
});

describe('LobbyPressureDials — monetization visibility (round 2)', () => {
  it('sits on a solid calm panel, not naked on the full-bleed art', () => {
    setup();
    const section = screen.getByTestId('pressure-dials');
    expect(section.className).toContain('bg-neo-navy-light');
    expect(section.className).toContain('border-neo-cream/40');
  });
});
