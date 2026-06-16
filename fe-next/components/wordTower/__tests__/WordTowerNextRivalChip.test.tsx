import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerNextRivalChip } from '../WordTowerNextRivalChip';
import type { RivalMarker } from '@/lib/wordTower/rivals';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const rivals: RivalMarker[] = [
  { id: 'a', name: 'Ann', heightM: 40 },
  { id: 'b', name: 'Bo', heightM: 100 },
];

describe('WordTowerNextRivalChip', () => {
  it('shows the closest rival still above with the gap to pass them', () => {
    render(<WordTowerNextRivalChip rivals={rivals} viewerHeightM={50} t={t} dir="ltr" />);
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('wordTower.hud.chaseGap:50')).toBeInTheDocument(); // 100 - 50
  });

  it('renders nothing once every rival is below (nothing left to chase)', () => {
    const { container } = render(<WordTowerNextRivalChip rivals={rivals} viewerHeightM={500} t={t} dir="ltr" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing with no rivals', () => {
    const { container } = render(<WordTowerNextRivalChip rivals={[]} viewerHeightM={10} t={t} dir="ltr" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the rival REAL avatar (their identity face), not a flat emoji', () => {
    render(<WordTowerNextRivalChip rivals={rivals} viewerHeightM={50} t={t} dir="ltr" />);
    // The shared <Avatar> (seeded from playerId/id when no custom config) — not 🧗.
    expect(screen.getByTestId('header-avatar')).toBeInTheDocument();
    expect(screen.queryByText('🧗')).not.toBeInTheDocument();
  });
});
