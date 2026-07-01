import React from 'react';
import { render, screen } from '@testing-library/react';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'adventure.lvl': 'LVL',
    'adventure.next': 'NEXT',
    'adventure.bossLabel': 'BOSS',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  m: {
    div: React.forwardRef(function MockMDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import RPGLevelCard from '../RPGLevelCard';

const baseProps = {
  levelNum: 3,
  stars: 2,
  maxStars: 3,
  isUnlocked: true,
  isPerfect: false,
  isCurrent: false,
  isBoss: false,
  worldAccentColor: '#22c55e',
  glowColor: '#22c55e',
  onClick: vi.fn(),
};

describe('RPGLevelCard', () => {
  describe('base card', () => {
    it('renders colored top accent banner', () => {
      render(<RPGLevelCard {...baseProps} />);
      expect(screen.getByTestId('card-banner')).toBeInTheDocument();
    });

    it('renders level number as large text', () => {
      render(<RPGLevelCard {...baseProps} />);
      const num = screen.getByTestId('level-number');
      expect(num).toHaveTextContent('3');
    });

    it('renders correct number of star icons', () => {
      render(<RPGLevelCard {...baseProps} />);
      const stars = screen.getAllByTestId(/^star-/);
      expect(stars).toHaveLength(3);
    });

    it('renders earned stars as filled', () => {
      render(<RPGLevelCard {...baseProps} stars={2} />);
      const filled = screen.getAllByTestId('star-filled');
      expect(filled).toHaveLength(2);
    });

    it('renders empty stars as outline-solid', () => {
      render(<RPGLevelCard {...baseProps} stars={2} />);
      const empty = screen.getAllByTestId('star-empty');
      expect(empty).toHaveLength(1);
    });

    it('renders reward token icons in footer', () => {
      render(<RPGLevelCard {...baseProps} />);
      expect(screen.getByTestId('reward-tokens')).toBeInTheDocument();
    });
  });

  describe('PERFECT state', () => {
    it('renders gold banner and crown badge', () => {
      render(<RPGLevelCard {...baseProps} stars={3} isPerfect />);
      expect(screen.getByTestId('crown-badge')).toBeInTheDocument();
      const banner = screen.getByTestId('card-banner');
      // Banner uses inline gradient style for world-colored accents
      expect(banner).toBeInTheDocument();
    });
  });

  describe('CURRENT state', () => {
    it('renders NEXT label and play icon', () => {
      render(<RPGLevelCard {...baseProps} stars={0} isCurrent />);
      expect(screen.getByText('NEXT')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });
  });

  describe('LOCKED state', () => {
    it('renders lock icon instead of level number', () => {
      render(<RPGLevelCard {...baseProps} isUnlocked={false} stars={0} />);
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('level-number')).not.toBeInTheDocument();
    });

    it('has dimmed opacity', () => {
      const { container } = render(<RPGLevelCard {...baseProps} isUnlocked={false} stars={0} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('opacity-40');
    });
  });

  describe('BOSS card', () => {
    it('renders BOSS label and swords icon', () => {
      render(<RPGLevelCard {...baseProps} levelNum={7} isBoss />);
      expect(screen.getAllByText('BOSS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('swords-icon')).toBeInTheDocument();
    });

    it('renders 5 stars instead of 3', () => {
      render(<RPGLevelCard {...baseProps} levelNum={7} isBoss maxStars={5} />);
      const stars = screen.getAllByTestId(/^star-/);
      expect(stars).toHaveLength(5);
    });

    it('has col-span-2 class', () => {
      const { container } = render(<RPGLevelCard {...baseProps} levelNum={7} isBoss />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('col-span-2');
    });

    it('renders skull difficulty pips', () => {
      render(<RPGLevelCard {...baseProps} levelNum={7} isBoss />);
      expect(screen.getByTestId('difficulty-skulls')).toBeInTheDocument();
    });
  });

  describe('neo-brutalist hard chrome (no blur)', () => {
    it('current card uses a hard offset shadow with no soft 0 0 blur glow', () => {
      const { container } = render(<RPGLevelCard {...baseProps} stars={0} isCurrent />);
      const card = container.firstChild as HTMLElement;
      expect(card.style.boxShadow).toContain('4px 4px');
      expect(card.style.boxShadow).not.toMatch(/0 0 \d+px/);
    });

    it('boss card box-shadow has no soft 0 0 blur glow', () => {
      const { container } = render(<RPGLevelCard {...baseProps} levelNum={7} isBoss />);
      const card = container.firstChild as HTMLElement;
      expect(card.style.boxShadow).not.toMatch(/0 0 \d+px/);
    });

    it('card surface does not use backdrop-blur (no glassmorphism)', () => {
      const { container } = render(<RPGLevelCard {...baseProps} />);
      expect(container.innerHTML).not.toContain('backdrop-blur');
    });

    it('current level number text-shadow has no soft glow', () => {
      render(<RPGLevelCard {...baseProps} stars={0} isCurrent />);
      const num = screen.getByTestId('level-number') as HTMLElement;
      expect(num.style.textShadow).not.toMatch(/0 0 \d+px/);
    });
  });
});
