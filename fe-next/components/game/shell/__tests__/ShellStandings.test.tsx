import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShellStandings } from '../ShellStandings';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('ShellStandings', () => {
  it('ranks players by score, highest first, and marks me', () => {
    render(
      <ShellStandings
        rows={[
          { id: 'me', name: 'You', score: 10, isMe: true },
          { id: 'ada', name: 'Ada', score: 25 },
          { id: 'bo', name: 'Bo', score: 4 },
        ]}
        t={t}
      />,
    );
    const rows = screen.getAllByTestId(/^shell-standing-/);
    expect(rows.map((r) => r.getAttribute('data-id'))).toEqual(['ada', 'me', 'bo']);
    expect(rows[1].getAttribute('data-me')).toBe('true');
    expect(rows[0].textContent).toContain('1');
  });

  it('tells me the gap to the player directly above', () => {
    render(
      <ShellStandings
        rows={[
          { id: 'me', name: 'You', score: 10, isMe: true },
          { id: 'ada', name: 'Ada', score: 25 },
        ]}
        t={t}
      />,
    );
    expect(screen.getByTestId('shell-standings-status').textContent).toBe('gameShell.behind:15,Ada');
  });

  it('says I am leading when nobody is above me', () => {
    render(
      <ShellStandings
        rows={[
          { id: 'me', name: 'You', score: 30, isMe: true },
          { id: 'ada', name: 'Ada', score: 25 },
        ]}
        t={t}
      />,
    );
    expect(screen.getByTestId('shell-standings-status').textContent).toBe('gameShell.leading');
  });

  it('sizes each bar against the leader so the race reads at a glance', () => {
    render(
      <ShellStandings
        rows={[
          { id: 'me', name: 'You', score: 10, isMe: true },
          { id: 'ada', name: 'Ada', score: 40 },
        ]}
        t={t}
      />,
    );
    const bar = screen.getByTestId('shell-standing-me').querySelector('[data-bar]') as HTMLElement;
    expect(bar.style.transform).toBe('scaleX(0.25)');
  });
});
