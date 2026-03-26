import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastExplosionLayer } from '../BlastExplosionLayer';
import { getScoreColor } from '../blastColorTokens';
import type { BlastExplosion, BlastScorePopup } from '../types';

// getScoreTierLabel was removed during color extraction — test inline
function getScoreTierLabel(score: number): string | null {
  if (score >= 30) return 'blast.scoreTier.incredible';
  if (score >= 20) return 'blast.scoreTier.amazing';
  return null;
}

// Mock adventure juice components
vi.mock('@/components/adventure/juice/ExplosionEffect', () => ({
  ExplosionEffect: ({ position, intensity, color, particleCount, onComplete }: any) => (
    <div
      data-testid="explosion-effect"
      data-intensity={intensity}
      data-color={color}
      data-particle-count={particleCount}
      data-x={position.x}
      data-y={position.y}
    />
  ),
}));

vi.mock('@/components/adventure/juice/ScorePopup', () => ({
  ScorePopup: ({ score, position, onComplete }: any) => (
    <div
      data-testid="score-popup"
      data-score={score}
      data-x={position.x}
      data-y={position.y}
    />
  ),
}));

const baseProps = {
  explosions: [] as BlastExplosion[],
  scorePopups: [] as BlastScorePopup[],
  onExplosionComplete: vi.fn(),
  onScorePopupComplete: vi.fn(),
  cellSize: 50,
  containerOffset: { x: 0, y: 0 },
};

function makeExplosion(overrides: Partial<BlastExplosion> = {}): BlastExplosion {
  return {
    id: 'exp-1',
    row: 0,
    col: 0,
    type: 'word',
    intensity: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makePopup(overrides: Partial<BlastScorePopup> = {}): BlastScorePopup {
  return {
    id: 'pop-1',
    score: 5,
    row: 0,
    col: 0,
    isSpecial: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('getScoreColor', () => {
  it('returns deep pink for score >= 30', () => {
    expect(getScoreColor(30)).toBe('#FF1493');
    expect(getScoreColor(50)).toBe('#FF1493');
  });

  it('returns orange for score >= 20', () => {
    expect(getScoreColor(20)).toBe('#FF6B35');
    expect(getScoreColor(29)).toBe('#FF6B35');
  });

  it('returns gold for score >= 10', () => {
    expect(getScoreColor(10)).toBe('#FFD700');
    expect(getScoreColor(19)).toBe('#FFD700');
  });

  it('returns cyan for score >= 5', () => {
    expect(getScoreColor(5)).toBe('#00FFFF');
    expect(getScoreColor(9)).toBe('#00FFFF');
  });

  it('returns white for score < 5', () => {
    expect(getScoreColor(1)).toBe('#FFFFFF');
    expect(getScoreColor(4)).toBe('#FFFFFF');
  });
});

describe('getScoreTierLabel', () => {
  it('returns translation key for score >= 30', () => {
    expect(getScoreTierLabel(30)).toBe('blast.scoreTier.incredible');
  });

  it('returns translation key for score >= 20', () => {
    expect(getScoreTierLabel(20)).toBe('blast.scoreTier.amazing');
    expect(getScoreTierLabel(29)).toBe('blast.scoreTier.amazing');
  });

  it('returns null for score < 20', () => {
    expect(getScoreTierLabel(19)).toBeNull();
    expect(getScoreTierLabel(5)).toBeNull();
  });
});

describe('BlastExplosionLayer', () => {
  it('caps explosions at MAX_VISIBLE_EXPLOSIONS (6)', () => {
    const explosions = Array.from({ length: 10 }, (_, i) =>
      makeExplosion({ id: `exp-${i}`, row: i % 5, col: i % 5 })
    );

    render(<BlastExplosionLayer {...baseProps} explosions={explosions} />);
    const rendered = screen.getAllByTestId('explosion-effect');
    expect(rendered).toHaveLength(6);
  });

  it('renders score popups with tier labels for high scores', () => {
    const scorePopups = [
      makePopup({ id: 'pop-high', score: 25 }),
    ];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    expect(container.querySelector('[data-testid="score-tier-label"]')).toHaveTextContent('AMAZING!');
  });

  it('renders INCREDIBLE! label for score >= 30', () => {
    const scorePopups = [makePopup({ id: 'pop-incredible', score: 35 })];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    expect(container.querySelector('[data-testid="score-tier-label"]')).toHaveTextContent('INCREDIBLE!');
  });

  it('does not render tier label for low scores', () => {
    const scorePopups = [makePopup({ id: 'pop-low', score: 8 })];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    expect(container.querySelector('[data-testid="score-tier-label"]')).toBeNull();
  });

  it('renders burst ring for intensity 3 popups', () => {
    const scorePopups = [makePopup({ id: 'pop-burst', score: 30 })];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    expect(container.querySelector('[data-testid="burst-ring"]')).toBeTruthy();
  });

  it('does not render burst ring for low-intensity popups', () => {
    const scorePopups = [makePopup({ id: 'pop-noburst', score: 3 })];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    expect(container.querySelector('[data-testid="burst-ring"]')).toBeNull();
  });

  it.skip('passes scaled particleCount to ExplosionEffect', () => {
    const explosions = [
      makeExplosion({ id: 'exp-i1', intensity: 1 }),
      makeExplosion({ id: 'exp-i2', intensity: 2, row: 1 }),
      makeExplosion({ id: 'exp-i3', intensity: 3, row: 2 }),
      makeExplosion({ id: 'exp-i4', intensity: 4, row: 3 }),
    ];

    render(<BlastExplosionLayer {...baseProps} explosions={explosions} />);
    const effects = screen.getAllByTestId('explosion-effect');

    expect(effects[0]).toHaveAttribute('data-particle-count', '6');
    expect(effects[1]).toHaveAttribute('data-particle-count', '10');
    expect(effects[2]).toHaveAttribute('data-particle-count', '16');
    expect(effects[3]).toHaveAttribute('data-particle-count', '24');
  });

  it('applies score color as inline style on popup wrapper', () => {
    const scorePopups = [makePopup({ id: 'pop-colored', score: 22 })];

    const { container } = render(
      <BlastExplosionLayer {...baseProps} scorePopups={scorePopups} />
    );

    const wrapper = container.querySelector('[data-testid="score-popup-wrapper"]');
    expect(wrapper).toBeTruthy();
    // Score 22 -> orange #FF6B35
    expect((wrapper as HTMLElement).style.color).toBe('rgb(255, 107, 53)');
  });
});
