import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockT = (key: string, p?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'adventure.next': 'NEXT',
    'adventure.bossLabel': 'BOSS',
    'adventurePlay.variety.kind.fog': 'Fog',
    'adventurePlay.variety.kind.hunt': 'Word Hunt',
    'adventurePlay.variety.kind.elite': 'Elite',
    'adventurePlay.variety.kind.boss': 'Boss',
    'adventurePlay.variety.youAreHere': 'You are here',
  };
  return translations[key] ?? (p ? `${key}:${JSON.stringify(p)}` : key);
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import RPGLevelCard from '../RPGLevelCard';

const baseProps = {
  levelNum: 3,
  stars: 2,
  maxStars: 3,
  kind: 'fog' as const,
  status: 'cleared' as const,
  isPerfect: false,
  threat: 3,
  labelSide: 'right' as const,
  onClick: vi.fn(),
};

describe('RPGLevelCard (trail node)', () => {
  it('Given a fog level, When rendered, Then the node carries the fog silhouette, icon and kind name', () => {
    render(<RPGLevelCard {...baseProps} />);
    const node = screen.getByTestId('level-card-3');
    expect(node).toHaveAttribute('data-kind-node', 'fog');
    expect(node).toHaveAttribute('data-shape', 'cloud');
    expect(screen.getByText('Fog')).toBeInTheDocument();
  });

  it('Given a hunt level, When rendered, Then it uses a different silhouette than fog', () => {
    render(<RPGLevelCard {...baseProps} kind="hunt" />);
    expect(screen.getByTestId('level-card-3')).toHaveAttribute('data-shape', 'diamond');
  });

  it('Given stars and threat, When rendered, Then the level number, stars and threat pips show', () => {
    render(<RPGLevelCard {...baseProps} />);
    expect(screen.getByTestId('level-number')).toHaveTextContent('3');
    expect(screen.getAllByTestId('star-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('star-empty')).toHaveLength(1);
    expect(screen.getByTestId('threat-pips')).toHaveAttribute('data-threat', '3');
  });

  it('Given a cleared node, When rendered, Then it shows the cleared check', () => {
    render(<RPGLevelCard {...baseProps} />);
    expect(screen.getByTestId('path-cleared')).toBeInTheDocument();
  });

  it('Given the current node, When rendered, Then it shows the you-are-here flag and play icon', () => {
    render(<RPGLevelCard {...baseProps} status="current" stars={0} />);
    expect(screen.getByTestId('level-card-3')).toHaveAttribute('data-status', 'current');
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('path-cleared')).not.toBeInTheDocument();
  });

  it('Given a locked node, When rendered, Then it shows a lock, is not focusable and ignores clicks', () => {
    const onClick = vi.fn();
    render(<RPGLevelCard {...baseProps} status="locked" stars={0} onClick={onClick} />);
    const node = screen.getByTestId('level-card-3');
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(node).toHaveAttribute('aria-disabled', 'true');
    expect(node).toHaveAttribute('tabindex', '-1');
    fireEvent.click(node);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Given an open node, When clicked or Enter pressed, Then it selects the level', () => {
    const onClick = vi.fn();
    render(<RPGLevelCard {...baseProps} status="open" stars={0} onClick={onClick} />);
    const node = screen.getByTestId('level-card-3');
    fireEvent.click(node);
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('Given an elite, When rendered, Then it is a big shield with the enemy portrait and enemy name', () => {
    render(<RPGLevelCard {...baseProps} levelNum={4} kind="elite" enemyArt="/images/adventure/enemies/w1-idle.webp" enemyName="Letter Golem" />);
    const node = screen.getByTestId('level-card-4');
    expect(node).toHaveAttribute('data-shape', 'shield');
    expect(node).toHaveAttribute('data-big', 'true');
    expect(screen.getByTestId('enemy-art')).toHaveAttribute('href', '/images/adventure/enemies/w1-idle.webp');
    expect(screen.getByText('Letter Golem')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('Given the boss, When rendered, Then it is the burst node with the boss tag', () => {
    render(<RPGLevelCard {...baseProps} levelNum={7} kind="boss" enemyArt="/videos/adventure/boss-w1.webp" enemyName="Ms. Grammar" />);
    expect(screen.getByTestId('level-card-7')).toHaveAttribute('data-shape', 'burst');
    expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
  });

  it('Given a perfect node, When rendered, Then it wears the crown', () => {
    render(<RPGLevelCard {...baseProps} stars={3} isPerfect />);
    expect(screen.getByTestId('crown-badge')).toBeInTheDocument();
  });

  it('Given any node, When rendered, Then shadows are hard pixel offsets (no blur glows, no glass)', () => {
    const { container } = render(<RPGLevelCard {...baseProps} />);
    expect(container.innerHTML).not.toContain('backdrop-blur');
    expect(container.innerHTML).not.toMatch(/drop-shadow\(0 0 \d/);
  });
});
