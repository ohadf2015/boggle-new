import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerNoticeColumn, type WordTowerNoticeColumnProps } from '../WordTowerNoticeColumn';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const idle = { value: null, exiting: false };

const baseProps: WordTowerNoticeColumnProps = {
  verdict: idle,
  lastResultTier: null,
  hazard: idle,
  clutch: idle,
  critical: false,
  newBest: idle,
  zone: idle,
  tease: null,
  reward: null,
  sabEarned: null,
  sabAdEarned: false,
  skinUnlock: idle,
  surprise: idle,
  combo: idle,
  milestone: idle,
  landmark: idle,
  ach: idle,
  wreckReport: null,
  reducedMotion: true,
  t,
};

describe('WordTowerNoticeColumn', () => {
  it('renders nothing visible when no beat is live', () => {
    const { container } = render(<WordTowerNoticeColumn {...baseProps} />);
    expect(container.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it('shows at most TWO beats — the rest queue behind them', () => {
    const { container } = render(
      <WordTowerNoticeColumn
        {...baseProps}
        verdict={{ value: { v: { tone: 'lime', labelKey: 'wordTower.verdict.perfect', gainText: '+4m', toppled: false }, key: 1 }, exiting: false }}
        zone={{ value: 'SKY', exiting: false }}
        reward={{ coins: 32, tier: 'common', source: 'zone', key: 2 }}
      />,
    );
    // Three cards stacked over the play field was the pile-up; two is the cap.
    // Each beat auto-dismisses, so the losers take a slot in turn.
    const column = container.querySelector('[data-testid="wt-notice-column"]') as HTMLElement;
    expect(column.className).toContain('flex-col');
    const beats = column.querySelectorAll(':scope > [role="status"]');
    expect(beats.length).toBe(2);
    // The verdict leads — it answers "did I nail it?" while the drop is landing.
    expect(beats[0].textContent).toContain('wordTower.verdict.perfect');
    expect(beats[0].textContent).toContain('+4m');
    // Zone (priority 50) takes the second slot; the coin reveal (55) waits.
    expect(column.textContent).toContain('SKY');
    expect(column.textContent).not.toContain('+32');
  });

  it('drops every lower-priority beat, however many fire at once', () => {
    const { container } = render(
      <WordTowerNoticeColumn
        {...baseProps}
        verdict={{ value: { v: { tone: 'lime', labelKey: 'wordTower.verdict.perfect', gainText: '+4m', toppled: false }, key: 1 }, exiting: false }}
        zone={{ value: 'SKY', exiting: false }}
        reward={{ coins: 32, tier: 'common', source: 'zone', key: 2 }}
        sabEarned={1}
      />,
    );
    const column = container.querySelector('[data-testid="wt-notice-column"]') as HTMLElement;
    const beats = column.querySelectorAll(':scope > [role="status"]');
    expect(beats.length).toBe(2);
    // Verdict + zone win the two slots; reward and the sabotage earn wait.
    expect(column.textContent).toContain('wordTower.verdict.perfect');
    expect(column.textContent).toContain('SKY');
    expect(column.textContent).not.toContain('+32');
    expect(column.textContent).not.toContain('wordTower.sabotage.earned');
  });

  it('applies the dedicated notice band from shared chrome framing', () => {
    const { container } = render(
      <WordTowerNoticeColumn {...baseProps} noticeTopPx={120} noticeMaxHeightPx={180} />,
    );
    const column = container.querySelector('[data-testid="wt-notice-column"]') as HTMLElement;
    expect(column.style.top).toBe('120px');
    expect(column.style.maxHeight).toBe('180px');
    // Overflow clip keeps stacked banners from spilling over the tower.
    expect(column.className).toContain('overflow-hidden');
  });

  it('shows the tier kicker on a celebration verdict, never on a miss', () => {
    const verdict = (tone: 'lime' | 'red') => ({
      value: { v: { tone, labelKey: 'k', gainText: '+1m', toppled: false }, key: 1 },
      exiting: false,
    });
    const { rerender } = render(
      <WordTowerNoticeColumn {...baseProps} verdict={verdict('lime')} lastResultTier="skyscraper" />,
    );
    expect(screen.getByText('wordTower.celebration.skyscraper')).toBeInTheDocument();
    rerender(<WordTowerNoticeColumn {...baseProps} verdict={verdict('red')} lastResultTier="skyscraper" />);
    expect(screen.queryByText('wordTower.celebration.skyscraper')).toBeNull();
  });

  it('renders the pulsing critical-lean alarm when flagged', () => {
    render(<WordTowerNoticeColumn {...baseProps} critical />);
    expect(screen.getByText(/wordTower\.clutch\.critical/)).toBeInTheDocument();
  });

  it('promises the next-word payoff on an updraft surprise', () => {
    render(
      <WordTowerNoticeColumn
        {...baseProps}
        surprise={{ value: { s: { event: 'updraft', bonusMeters: 0, bonusScrambles: 0 } as never, key: 3 }, exiting: false }}
      />,
    );
    expect(screen.getByText(/wordTower\.surprise\.nextWord/)).toBeInTheDocument();
  });
});
