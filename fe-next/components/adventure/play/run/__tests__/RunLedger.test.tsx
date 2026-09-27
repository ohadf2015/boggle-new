/**
 * The win ledger on screen. The rule under test is that every beat gets its own
 * ROW with its own contribution and the total is the sum on screen — the thing
 * two review rounds said our run-end recap did not have.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
// The count-up is `GoldCounter.useCountUp` (rAF); here it lands instantly so
// the assertions read the settled numbers rather than racing an animation.
vi.mock('../GoldCounter', () => ({ useCountUp: (target: number) => target, default: () => null }));

import RunLedger from '../RunLedger';
import { LEDGER_PER, runLedger } from '../ledger';
import type { RunMap } from '@/lib/adventure/play/runMap';

const map: RunMap = {
  world: 1, rows: 8, edges: [],
  nodes: (['fight', 'fight', 'treasure', 'elite', 'shop', 'event', 'rest', 'boss'] as const)
    .map((kind, i) => ({ id: `n${i}`, row: i, lane: 0, kind })),
};
const path = map.nodes.map((n) => n.id);

const props = {
  map, path, won: true, words: 14, bestWord: { word: 'STORMLIT', pts: 34 },
  gold: 138, relics: ['storm-rune', 'long-bow'] as const, hp: 6, maxHp: 6,
};

describe('RunLedger', () => {
  it('Given a cleared act, then every beat has its own row and its own points', () => {
    render(<RunLedger {...props} />);
    expect(screen.getByTestId('run-ledger')).toBeInTheDocument();
    for (const key of ['nodes', 'enemies', 'elites', 'boss', 'words', 'bestWord', 'gold', 'relics', 'flawless']) {
      expect(screen.getByTestId(`ledger-${key}`)).toBeInTheDocument();
    }
    // The boss row states both what it counted and what it paid.
    expect(screen.getByTestId('ledger-boss')).toHaveTextContent(`1×${LEDGER_PER.boss}`);
    expect(screen.getByTestId('ledger-boss')).toHaveTextContent(String(LEDGER_PER.boss));
  });

  it('Given the rows are settled, then the total on screen is exactly their sum', () => {
    render(<RunLedger {...props} />);
    const total = runLedger(props).total;
    expect(screen.getByTestId('ledger-total')).toHaveTextContent(String(total));
  });

  it('Given a death before the boss, then the boss row still prints — at nought — and no flawless bonus', () => {
    render(<RunLedger {...props} won={false} hp={0} />);
    expect(screen.getByTestId('ledger-boss')).toHaveTextContent('0');
    expect(screen.queryByTestId('ledger-flawless')).toBeNull();
    expect(screen.getByTestId('ledger-enemies')).toBeInTheDocument();
  });

  it('Given a first-node death, then the sheet still itemizes the whole climb instead of one lonely line', () => {
    render(<RunLedger {...props} map={null} path={[]} won={false} words={0} bestWord={null} gold={0} relics={[]} />);
    expect(screen.getByTestId('run-ledger')).toBeInTheDocument();
    for (const key of ['nodes', 'enemies', 'elites', 'boss', 'words']) {
      expect(screen.getByTestId(`ledger-${key}`)).toBeInTheDocument();
    }
    // …and nothing it did not earn.
    expect(screen.queryByTestId('ledger-gold')).toBeNull();
    expect(screen.getByTestId('ledger-total')).toHaveTextContent('0');
  });

  it('Given the run score, then it is labelled as a RUN score, not the season points the strip shows', () => {
    render(<RunLedger {...props} />);
    expect(screen.getByTestId('run-ledger')).toHaveTextContent('adventurePlay.ledger.total');
    expect(screen.getByTestId('run-ledger')).not.toHaveTextContent('adventurePlay.eco.points');
  });
});
