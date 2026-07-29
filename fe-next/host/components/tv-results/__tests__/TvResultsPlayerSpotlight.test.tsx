import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} data-testid={props['data-testid'] as string} {...filterDomProps(props)}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: {
      div: MotionDiv,
      h3: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <h3 {...filterDomProps(props)}>{children}</h3>
      ),
      p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <p {...filterDomProps(props)}>{children}</p>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Filter out non-DOM props from framer-motion
function filterDomProps(props: Record<string, unknown>) {
  const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
  void initial; void animate; void exit; void transition; void whileHover; void whileTap; void layout;
  return rest;
}

// Mock Avatar component
vi.mock('../../../../components/Avatar', () => ({
  default: function MockAvatar({ className }: { className?: string }) {
    return <div data-testid="avatar" className={className} />;
  },
}));

// Mock the engine
vi.mock('../playerSpotlightEngine', () => ({
  assignArchetypes: vi.fn(),
  ARCHETYPES: Array.from({ length: 17 }, (_, i) => ({
    id: `archetype-${i}`,
    titleKey: `tvResults.spotlight.archetypes.archetype-${i}.title`,
    quipKeys: [`quip1`, `quip2`, `quip3`, `quip4`],
    statLabelKey: `tvResults.spotlight.archetypes.archetype-${i}.stat`,
    color: 'bg-neo-cyan',
  })),
}));

import TvResultsPlayerSpotlight from '../TvResultsPlayerSpotlight';
import { assignArchetypes } from '../playerSpotlightEngine';

const mockAssignArchetypes = assignArchetypes as MockedFunction<typeof assignArchetypes>;

const mockT = (key: string) => `[${key}]`;

function makeAssignment(username: string, archetypeId: string, quip: string, statValue: number) {
  return {
    player: { username, score: 100, allWords: [] },
    archetype: {
      id: archetypeId,
      titleKey: `tvResults.spotlight.archetypes.${archetypeId}.title`,
      quipKeys: [`q1`, `q2`, `q3`, `q4`],
      statLabelKey: `tvResults.spotlight.archetypes.${archetypeId}.stat`,
      color: 'bg-neo-cyan',
    },
    quip,
    quipIndex: 0,
    keyStat: {
      value: statValue,
      labelKey: `tvResults.spotlight.archetypes.${archetypeId}.stat`,
      formatted: `${statValue}`,
    },
  };
}

describe('TvResultsPlayerSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when visible is false', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('player1', 'the-ghost', 'quip-key', 5),
    ]);

    const { container } = render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'player1', score: 100, allWords: [] }]}
        visible={false}
        gameDuration={180}
        t={mockT}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render player cards when visible', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-ghost', 'tvResults.spotlight.archetypes.the-ghost.quip1', 5),
      makeAssignment('Bob', 'the-sniper', 'tvResults.spotlight.archetypes.the-sniper.quip1', 95),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[
          { username: 'Alice', score: 200, allWords: [] },
          { username: 'Bob', score: 150, allWords: [] },
        ]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    // Check player names rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should render archetype titles via translation keys', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-ghost', 'quip1', 5),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'Alice', score: 200, allWords: [] }]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    // Title should be translated
    expect(screen.getByText('[tvResults.spotlight.archetypes.the-ghost.title]')).toBeInTheDocument();
  });

  it('should render quips via translation keys', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-ghost', 'tvResults.spotlight.archetypes.the-ghost.quip1', 5),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'Alice', score: 200, allWords: [] }]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    expect(screen.getByText('[tvResults.spotlight.archetypes.the-ghost.quip1]')).toBeInTheDocument();
  });

  it('should render key stat values', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-sniper', 'quip1', 95),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'Alice', score: 200, allWords: [] }]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('should render mascot speech bubble', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-ghost', 'quip1', 5),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'Alice', score: 200, allWords: [] }]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    // Mascot intro uses one of the spotlight intro keys
    const introText = screen.getByText((content) =>
      content.includes('[tvResults.spotlight.mascotIntro')
    );
    expect(introText).toBeInTheDocument();
  });

  it('should show "+X more" when more than 8 players', () => {
    const assignments = Array.from({ length: 10 }, (_, i) =>
      makeAssignment(`player${i}`, 'the-participant', 'quip1', i)
    );
    mockAssignArchetypes.mockReturnValue(assignments);

    const players = Array.from({ length: 10 }, (_, i) => ({
      username: `player${i}`,
      score: 100 - i * 10,
      allWords: [],
    }));

    render(
      <TvResultsPlayerSpotlight
        players={players}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    // Should show +2 more
    expect(screen.getByText((content) =>
      content.includes('[tvResults.spotlight.andMore')
    )).toBeInTheDocument();
  });

  it('should not render when no players', () => {
    mockAssignArchetypes.mockReturnValue([]);

    const { container } = render(
      <TvResultsPlayerSpotlight
        players={[]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render section heading via translation', () => {
    mockAssignArchetypes.mockReturnValue([
      makeAssignment('Alice', 'the-ghost', 'quip1', 5),
    ]);

    render(
      <TvResultsPlayerSpotlight
        players={[{ username: 'Alice', score: 200, allWords: [] }]}
        visible={true}
        gameDuration={180}
        t={mockT}
      />
    );

    expect(screen.getByText('[tvResults.spotlight.heading]')).toBeInTheDocument();
  });
});
