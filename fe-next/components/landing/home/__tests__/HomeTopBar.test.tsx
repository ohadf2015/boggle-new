import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeTopBar } from '../HomeTopBar';
import type { ProfileData } from '@/contexts/auth/authTypes';

// Avatar pulls app contexts we don't need here — stub it to a marker node.
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-stub" />,
}));

// Simple interpolating t — substitutes {param} tokens so we can assert real output.
const t = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    'common.player': 'Player',
    'landing.home.greeting': 'Hey, {name}',
    'landing.home.levelTitle': 'Level {level} · {title}',
    'landing.home.levelOnly': 'Level {level}',
  };
  let s = dict[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
};

describe('HomeTopBar', () => {
  it('renders real name, level and coins from the profile', () => {
    const profile = {
      id: 'u1',
      username: 'm-fallback',
      display_name: 'Maya',
      current_level: 7,
      total_xp: 0,
      total_coins: 2840,
    } as unknown as ProfileData;

    render(<HomeTopBar profile={profile} streak={12} t={t} />);

    expect(screen.getByText('Hey, Maya')).toBeInTheDocument();
    expect(screen.getByText('2,840')).toBeInTheDocument(); // localized coins
    expect(screen.getByText('12')).toBeInTheDocument(); // streak
    // level badge shows the persisted level
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('degrades gracefully with a null profile — never "undefined" / no crash', () => {
    render(<HomeTopBar profile={null} streak={0} t={t} />);
    // falls back to the translated player noun, level 1, zero coins
    expect(screen.getByText('Hey, Player')).toBeInTheDocument();
    // streak "0" + coins "0" both render
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    // XP-derived level when none persisted
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });
});
