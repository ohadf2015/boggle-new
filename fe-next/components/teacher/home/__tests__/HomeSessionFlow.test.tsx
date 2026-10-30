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

  it('Then a card is calm: no pictures, the steps are read to screen readers and shown on the run sheet, the live step naming the class game', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    expect(card.querySelectorAll('[data-src]')).toHaveLength(1);
    const steps = within(card).getAllByTestId('home-session-step');
    expect(steps.map((s) => s.getAttribute('data-step'))).toEqual(['learn', 'solo', 'live']);
    for (const s of steps) expect(s.querySelector('[data-src]')).toBeNull();
    expect(steps[2]).toHaveTextContent(/eduShell\.home\.flow\.live/);
    const line = steps[0].parentElement!;
    expect(line.className).toBe('sr-only');
  });

  it('Then each card carries its own accent color, neighbours never match, and lime stays reserved for the one primary button', () => {
    renderRail();
    const cards = [...screen.getAllByTestId('home-session-card'), ...screen.queryAllByTestId('home-session-card-more')];
    const accents = cards.map((c) => c.getAttribute('data-accent'));
    expect(accents.every(Boolean)).toBe(true);
    accents.slice(1).forEach((a, i) => expect(a).not.toBe(accents[i]));
    expect(accents).not.toContain('lime');
    for (const card of cards) {
      expect(card.className).toMatch(/border-t-neo-(cyan|pink|purple|yellow|orange)/);
      expect(within(card).getByTestId('home-session-run').className).not.toMatch(/(^|\s)bg-neo-/);
    }
  });

  it('Then the when-to-use line is the short copy on one line', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    const when = within(card).getByTestId('home-session-when');
    expect(when).toHaveTextContent('education.starterPacks.session.warmUp.whenShort');
    expect(when.className).toMatch(/line-clamp-1/);
    expect(when.className).not.toMatch(/line-clamp-2|max-sm:!hidden/);
  });

  it('Then the run button starts the whole lesson for a list session', () => {
    renderRail();
    const [card] = screen.getAllByTestId('home-session-card');
    const run = within(card).getByTestId('home-session-run');
    expect(run).toHaveTextContent('eduShell.home.flow.start');
    expect(new URL(run.getAttribute('href')!, 'https://x.test').searchParams.get('session')).toBe('warm-up');
  });
});
