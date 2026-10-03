import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomBossBar } from '../ClassroomBossBar';
import { ClassroomBossOutcome } from '../ClassroomBossOutcome';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);
const full = { maxHp: 10, hp: 10, lastHits: 0, defeated: false };

describe('<ClassroomBossBar>', () => {
  it('renders nothing on a plain quiz', () => {
    const { container } = render(<ClassroomBossBar boss={null} phase="question" surface="host" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the dragon and its HP as a share of the bar', () => {
    render(<ClassroomBossBar boss={{ ...full, hp: 4 }} phase="question" surface="host" t={t} />);
    expect(screen.getByTestId('boss-bar')).toHaveTextContent('eg2Modes.boss.dragon');
    expect(screen.getByTestId('boss-hp-text')).toHaveTextContent('eg2Modes.boss.hp|{"hp":4,"max":10}');
    expect(screen.getByTestId('boss-hp-fill')).toHaveAttribute('data-fraction', '0.4');
  });

  it('flinches and shows the class damage on a reveal that landed hits', () => {
    render(<ClassroomBossBar boss={{ ...full, hp: 7, lastHits: 3 }} phase="reveal" surface="host" t={t} />);
    expect(screen.getByTestId('boss-hit-pop')).toHaveTextContent('−3');
    expect(screen.getByTestId('boss-art')).toHaveAttribute('src', expect.stringContaining('-hurt'));
  });

  it('keeps calm art and no damage pop while the question runs', () => {
    render(<ClassroomBossBar boss={{ ...full, hp: 7, lastHits: 3 }} phase="question" surface="host" t={t} />);
    expect(screen.queryByTestId('boss-hit-pop')).not.toBeInTheDocument();
    expect(screen.getByTestId('boss-art').getAttribute('src')).not.toContain('-hurt');
  });

  it('tells a student what their own answer did, from the server number', () => {
    const { rerender } = render(<ClassroomBossBar boss={{ ...full, hp: 8, lastHits: 2 }} phase="reveal" surface="student" myHit={2} t={t} />);
    expect(screen.getByTestId('boss-my-hit')).toHaveTextContent('eg2Modes.boss.yourCrit|{"hits":2}');
    rerender(<ClassroomBossBar boss={{ ...full, hp: 8, lastHits: 2 }} phase="reveal" surface="student" myHit={1} t={t} />);
    expect(screen.getByTestId('boss-my-hit')).toHaveTextContent('eg2Modes.boss.yourHit|{"hits":1}');
    rerender(<ClassroomBossBar boss={{ ...full, hp: 8, lastHits: 2 }} phase="reveal" surface="student" myHit={0} t={t} />);
    expect(screen.getByTestId('boss-my-hit')).toHaveTextContent('eg2Modes.boss.noHit');
  });
});

describe('<ClassroomBossOutcome>', () => {
  it('celebrates a felled boss', () => {
    render(<ClassroomBossOutcome boss={{ ...full, hp: 0, lastHits: 2, defeated: true }} t={t} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'defeated');
    expect(screen.getByTestId('boss-outcome')).toHaveTextContent('eg2Modes.boss.defeatedTitle');
  });

  it('owns up when the boss escaped, with the HP it kept', () => {
    render(<ClassroomBossOutcome boss={{ ...full, hp: 3 }} t={t} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'escaped');
    expect(screen.getByTestId('boss-outcome')).toHaveTextContent('eg2Modes.boss.escapedBody|{"hp":3}');
  });

  it('stays a slim banner on a 900px-tall wall and only grows on a 1080p one, so the podium below fits', () => {
    render(<ClassroomBossOutcome boss={{ ...full, hp: 0, lastHits: 2, defeated: true }} t={t} />);
    const art = screen.getByTestId('boss-outcome').querySelector('img')!;
    expect(art.className).not.toMatch(/(^| )md:size-32( |$)/);
    expect(art.className).toContain('md:[@media(min-height:1000px)]:size-32');
  });

  it('renders nothing without a boss', () => {
    const { container } = render(<ClassroomBossOutcome boss={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
