import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

import { StreakMark } from '../StreakMark';
import { AcademyHud } from '../AcademyHud';
import { ClassStrip } from '../ClassStrip';

const t = (k: string) => k;
const hud = { userId: 'u1', name: 'Maya', totalXp: 0, streak: 4, stars: 0, isGuest: false, onSignOut: () => {}, reducedMotion: true };

describe('<StreakMark> one streak flame for the whole Academy', () => {
  it('Given a streak at risk, Then a screen reader hears the warning as real text, not an aria-label on a role-less span', () => {
    render(<StreakMark streak={4} atRisk still size={28} t={t} />);
    const mark = screen.getByTestId('academy-streak-flame');
    expect(within(mark).getByText('academy.student.streakAtRiskAria')).toHaveClass('sr-only');
  });

  it('Given a calm streak, Then there is no warning text', () => {
    render(<StreakMark streak={4} still size={28} t={t} />);
    expect(screen.queryByText('academy.student.streakAtRiskAria')).toBeNull();
  });

  it('Given reduced motion, Then the flame does not animate', () => {
    render(<StreakMark streak={4} atRisk still size={28} t={t} />);
    expect(screen.getByTestId('academy-streak-flame').innerHTML).not.toContain('academy-flame');
  });

  it('Given motion is allowed, Then it only scales (a transform keyframe), never an opacity pulse', () => {
    render(<StreakMark streak={4} still={false} size={28} t={t} />);
    const html = screen.getByTestId('academy-streak-flame').innerHTML;
    expect(html).toContain('academy-flame-calm');
    expect(html).not.toContain('animate-pulse');
  });
});

describe('Academy surfaces share the mark', () => {
  it('Given the HUD with a streak at risk, Then it uses the mark and says the warning as text', () => {
    render(<AcademyHud {...hud} streakAtRisk />);
    expect(screen.getByTestId('academy-streak-flame')).toHaveAttribute('data-state', 'at-risk');
    expect(screen.getByText('academy.student.streakAtRiskAria')).toBeInTheDocument();
  });

  it('Given the class strip with a streak, Then it shows the same ember mark, not a pink pulsing flame', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ streak: 3, playedToday: false, rematchRequestedToday: false }), { status: 200 })));
    render(<ClassStrip classroomId="c1" reducedMotion />);
    const mark = await screen.findByTestId('academy-streak-flame');
    expect(mark).toHaveAttribute('data-state', 'calm');
    expect(document.body.innerHTML).not.toMatch(/text-neo-pink[^"]*animate-pulse|animate-pulse/);
    vi.unstubAllGlobals();
  });

  it('Given a guest on the HUD, Then the "Not you?" control is a 44px target', () => {
    render(<AcademyHud {...hud} isGuest />);
    const btn = screen.getByRole('button', { name: 'student.notYou' });
    expect(btn.className).toMatch(/\bmin-h-11\b/);
    expect(btn.className).toMatch(/\bmin-w-11\b/);
  });
});
