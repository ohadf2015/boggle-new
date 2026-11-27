// @vitest-environment happy-dom
import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

const { motionTag } = vi.hoisted(() => ({
  motionTag: (Tag: 'div' | 'p' | 'span') => function Motion({ children, className, style, ...rest }: any) {
    const El = Tag as any;
    return <El className={className} style={style} data-testid={rest['data-testid']}>{children}</El>;
  },
}));
vi.mock('framer-motion', () => ({
  m: { div: motionTag('div'), p: motionTag('p'), span: motionTag('span') },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LayoutGroup: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => true,
}));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: { div: motionTag('div') },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true, useSuppressTimerUrgency: () => false }));
vi.mock('@/components/ui/AnimatedCounter', () => {
  const Counter = ({ value, className }: any) => <span className={className}>{value}</span>;
  return { default: Counter, AnimatedCounter: Counter };
});
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
const mode = vi.hoisted(() => ({ value: 'word-hunt' as string }));
vi.mock('@/hooks/gameState/store', () => ({ useGameMode: () => mode.value }));

import TvLeaderboard from '../TvLeaderboard';
import TvActivityPanel from '../TvActivityPanel';
import TvBattleBar from '../TvBattleBar';

const t = (key: string) => key;
const players = ['ana', 'bo', 'cy', 'di', 'ed'].map((username, i) => ({ username, score: 50 - i * 10, wordCount: 5 - i }));
const teams = [{ id: 0, memberNames: ['ana', 'cy', 'ed'] }, { id: 1, memberNames: ['bo', 'di'] }];
const DARK = /bg-neo-navy|text-neo-cream|text-neo-white|border-neo-cream|text-neo-yellow(\s|$)|border-neo-cyan|text-neo-cyan(\s|$)|text-neo-lime(\s|$)/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');
// White or cream ink stays allowed on solid red, black and purple fills.
const darkOf = (el: Element) => classesOf(el).filter((c) => DARK.test(c) && !/bg-neo-(red|black|purple)(\s|$)/.test(c));

const surfaces: Record<string, () => React.ReactElement> = {
  'team leaderboard': () => <TvLeaderboard players={players} teams={teams} gameMode="classic" t={t} />,
  'word-hunt leaderboard': () => <TvLeaderboard players={players} gameMode="word-hunt" wordHuntPlayerLives={{ ana: 3, bo: 1 }} wordHuntEliminatedPlayers={['ed']} t={t} />,
  'empty leaderboard': () => <TvLeaderboard players={[]} gameMode="word-hunt" t={t} />,
  'word-hunt activity panel': () => <TvActivityPanel playerScores={{ ana: 3 }} playerWordCounts={{ ana: 1 }} socket={null} t={t} wordHuntTargetLength={5} wordHuntAliveCount={4} wordHuntTotalPlayers={5} />,
};

describe('projector classroom skin on shared TV pieces', () => {
  it.each(Object.keys(surfaces))('arcade %s keeps its exact classes', (name) => {
    const { container } = render(surfaces[name]());
    expect(classesOf(container.firstElementChild!)).toMatchSnapshot();
  });

  it.each(Object.keys(surfaces))('classroom %s has no navy, cream or white ink', (name) => {
    const { container } = render(<ClassroomBoardProvider value>{surfaces[name]()}</ClassroomBoardProvider>);
    expect(darkOf(container.firstElementChild!)).toEqual([]);
  });

  it('the team battle bar (classroom-only) stands on the page colour with black seams', () => {
    const { container } = render(<TvBattleBar classroom={{ round: 1, lessonName: 'L', playStyle: 'teams', teams } as never} players={players} t={t} labelInHeader />);
    expect(container.firstElementChild).toHaveClass('bg-edu-page');
    expect(darkOf(container.firstElementChild!)).toEqual([]);
  });
});
