import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { xpForLevel } from '@/shared/xp/levelCurve';
import { LevelRing, LAST_SEEN_LEVEL_KEY, profileLevelProgress } from '../LevelRing';

describe('LevelRing', () => {
  beforeEach(() => localStorage.clear());

  it('Given a percent, Then the conic fill stops there and the track is a neo token', () => {
    render(<LevelRing pct={42} level={3} size={40}><span>face</span></LevelRing>);
    const ring = screen.getByTestId('level-ring');
    expect(ring.style.getPropertyValue('--ring-fill')).toBe('42%');
    expect(ring.className).toContain('var(--neo-lime)');
    expect(ring.className).not.toMatch(/rgba|#[0-9a-f]{3}/i);
    expect(screen.getByText('face')).toBeInTheDocument();
  });

  it('Given no level seen before, Then it stores the level silently', () => {
    render(<LevelRing pct={0} level={4} size={40} trackLevel />);
    expect(screen.getByTestId('level-ring')).not.toHaveAttribute('data-pulse');
    expect(localStorage.getItem(LAST_SEEN_LEVEL_KEY)).toBe('4');
  });

  it('Given a higher level than last seen, Then it pulses once and records the new level', () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem(LAST_SEEN_LEVEL_KEY, '4');
      render(<LevelRing pct={0} level={5} size={40} trackLevel />);
      expect(screen.getByTestId('level-ring')).toHaveAttribute('data-pulse', 'true');
      act(() => { vi.advanceTimersByTime(2000); });
      expect(screen.getByTestId('level-ring')).not.toHaveAttribute('data-pulse');
      expect(localStorage.getItem(LAST_SEEN_LEVEL_KEY)).toBe('5');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Given the same level as last seen, Then it does not pulse', () => {
    localStorage.setItem(LAST_SEEN_LEVEL_KEY, '5');
    render(<LevelRing pct={0} level={5} size={40} trackLevel />);
    expect(screen.getByTestId('level-ring')).not.toHaveAttribute('data-pulse');
  });
});

describe('profileLevelProgress', () => {
  it('derives level and percent from total XP', () => {
    const p = profileLevelProgress({ total_xp: xpForLevel(6), current_level: 2 });
    expect(p.level).toBe(6);
    expect(p.pct).toBe(0);
  });

  it('a higher stored level wins over XP that has not caught up, with an empty ring', () => {
    const p = profileLevelProgress({ total_xp: 0, current_level: 7 });
    expect(p.level).toBe(7);
    expect(p.pct).toBe(0);
  });

  it('falls back to the stored level when XP is missing', () => {
    expect(profileLevelProgress({ current_level: 7 }).level).toBe(7);
    expect(profileLevelProgress(null).level).toBe(1);
  });
});
