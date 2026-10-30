import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomeSessionRail } from '../HomeSessionRail';
import { SESSION_TEMPLATES, sessionFlowSteps } from '@/lib/education/sessionTemplates';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-src={String(props.src)} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
const NOW = Date.UTC(2026, 9, 30, 9);
const byId = (id: string) => SESSION_TEMPLATES.find((s) => s.id === id)!;

describe('sessionFlowSteps', () => {
  it('Given a session that plays a word list, Then students learn it, play it solo, then the class plays live', () => {
    expect(sessionFlowSteps(byId('warm-up'))).toEqual(['learn', 'solo', 'live']);
  });

  it('Given a session with no list, Then it is a single live game', () => {
    expect(sessionFlowSteps(byId('brain-break'))).toEqual(['live']);
  });
});

describe('HomeSessionRail flow cards', () => {
  function renderRail() {
    return render(<HomeSessionRail classroomId="c1" languages={['en']} gradeBand={null} nowMs={NOW} lastPlayedMs={null} ready locale="en" t={t} />);
  }

  it('Then each card shows its steps as pictures with a numbered label, the live step naming the class game', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    const steps = within(card).getAllByTestId('home-session-step');
    expect(steps.map((s) => s.getAttribute('data-step'))).toEqual(['learn', 'solo', 'live']);
    for (const s of steps) expect(s.querySelector('[data-src]')).not.toBeNull();
    expect(steps[2]).toHaveTextContent(/eduShell\.home\.flow\.live/);
    expect(within(card).getByTestId('home-session-when')).toHaveTextContent('education.starterPacks.session.warmUp.when');
  });

  it('Then the step art is big enough to tell apart, not a 40px sticker', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    const art = within(card).getAllByTestId('home-session-step')[0].querySelector('[data-src]')!.parentElement!;
    expect(art.className).not.toMatch(/(^|\s)size-10(\s|$)/);
    expect(art.className).toMatch(/aspect-square/);
  });

  it('Then the run button starts the whole lesson for a list session', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    const run = within(card).getByTestId('home-session-run');
    expect(run).toHaveTextContent('eduShell.home.flow.start');
    expect(new URL(run.getAttribute('href')!, 'https://x.test').searchParams.get('session')).toBe('warm-up');
  });
});
