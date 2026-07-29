import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLeaderboard from '../TvLeaderboard';

// Mock framer-motion with LayoutGroup support
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: React.forwardRef(function MotionDiv(
        { children, className, style, role, ...rest }: any,
        ref: any
      ) {
        return (
          <div
            ref={ref}
            className={className}
            style={style}
            role={role}
            data-layout={rest.layout ? 'true' : undefined}
            data-layout-id={rest.layoutId}
            data-testid={rest['data-testid']}
            aria-live={rest['aria-live']}
            aria-label={rest['aria-label']}
          >
            {children}
          </div>
        );
      }),
      p: React.forwardRef(function MotionP(
        { children, className, style, ...rest }: any,
        ref: any
      ) {
        return (
          <p ref={ref} className={className} style={style}>
            {children}
          </p>
        );
      }),
      span: React.forwardRef(function MotionSpan(
        { children, className, style, ...rest }: any,
        ref: any
      ) {
        return (
          <span ref={ref} className={className} style={style}>
            {children}
          </span>
        );
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    LayoutGroup: ({ children }: any) => (
      <div data-testid="layout-group">{children}</div>
    ),
  };
});

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

// Mock Avatar
vi.mock('../../../../components/Avatar', () => ({
  default: function MockAvatar({ className }: any) {
    return <div data-testid="avatar" className={className} />;
  },
}));

// Mock AnimatedCounter
vi.mock('../../../../components/ui/AnimatedCounter', () => ({
  AnimatedCounter: ({ value, className }: any) => (
    <span data-testid="animated-counter" className={className}>
      {value}
    </span>
  ),
  __esModule: true,
  default: ({ value, className }: any) => (
    <span data-testid="animated-counter" className={className}>
      {value}
    </span>
  ),
}));

// Mock useDevicePerformance
vi.mock('../../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

const mockT = (key: string) => key;

const makePlayers = (names: string[], scores: number[]) =>
  names.map((name, i) => ({
    username: name,
    score: scores[i],
    wordCount: i + 1,
  }));

describe('TvLeaderboard reordering animation', () => {
  it('wraps non-virtual list in LayoutGroup', () => {
    const players = makePlayers(['Alice', 'Bob'], [100, 50]);
    const { container } = render(
      <TvLeaderboard players={players} t={mockT} />
    );

    const layoutGroup = screen.getByTestId('layout-group');
    expect(layoutGroup).toBeInTheDocument();
  });

  it('adds layout prop and layoutId to each player card container', () => {
    const players = makePlayers(['Alice', 'Bob', 'Charlie'], [300, 200, 100]);
    render(<TvLeaderboard players={players} t={mockT} />);

    // Each player card wrapper should have layout + layoutId
    const layoutItems = document.querySelectorAll('[data-layout="true"]');
    expect(layoutItems.length).toBeGreaterThanOrEqual(3);

    // Verify unique layoutIds
    const layoutIds = Array.from(
      document.querySelectorAll('[data-layout-id]')
    ).map((el) => el.getAttribute('data-layout-id'));

    expect(layoutIds).toContain('player-Alice');
    expect(layoutIds).toContain('player-Bob');
    expect(layoutIds).toContain('player-Charlie');
  });

  it('uses flex with gap instead of space-y for layout animation compatibility', () => {
    const players = makePlayers(['Alice', 'Bob'], [100, 50]);
    const { container } = render(
      <TvLeaderboard players={players} t={mockT} />
    );

    // Should use flex flex-col gap, not space-y
    const listContainer = container.querySelector('.flex.flex-col');
    expect(listContainer).toBeInTheDocument();

    // Should NOT have space-y-2
    const spaceY = container.querySelector('.space-y-2');
    expect(spaceY).toBeNull();
  });

  it('sorts players by score descending', () => {
    const players = makePlayers(['Alice', 'Bob', 'Charlie'], [50, 300, 100]);
    render(<TvLeaderboard players={players} t={mockT} />);

    // Bob (300) should appear first
    const allText = document.body.textContent;
    const bobPos = allText?.indexOf('Bob') ?? -1;
    const charliePos = allText?.indexOf('Charlie') ?? -1;
    const alicePos = allText?.indexOf('Alice') ?? -1;

    expect(bobPos).toBeLessThan(charliePos);
    expect(charliePos).toBeLessThan(alicePos);
  });

  it('virtual list does NOT use LayoutGroup (performance)', () => {
    // Create 16+ players to trigger virtual mode
    const names = Array.from({ length: 16 }, (_, i) => `Player${i}`);
    const scores = Array.from({ length: 16 }, (_, i) => (16 - i) * 10);
    const players = makePlayers(names, scores);

    render(<TvLeaderboard players={players} t={mockT} />);

    // Virtual list should not wrap in LayoutGroup
    // (LayoutGroup is only used for non-virtual path)
    // The virtual path uses its own container
    const layoutGroups = screen.queryAllByTestId('layout-group');
    // Virtual path shouldn't have layout group
    expect(layoutGroups.length).toBe(0);
  });
});
