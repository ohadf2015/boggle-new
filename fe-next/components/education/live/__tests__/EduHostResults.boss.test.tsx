import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import { BossOutcomeCard } from '@/components/education/boss/BossOutcomeCard';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { sampleBossView, samplePreviewRound } from '@/components/education/results/resultsPreviewFixtures';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '',
  CLASS_SWEEP_SOUND: '',
}));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const screenSize = vi.hoisted(() => ({ phone: false }));
vi.mock('@/components/education/results/useIsPhoneRecap', () => ({
  useIsPhoneRecap: () => screenSize.phone,
}));
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProOfferImpression: vi.fn(),
  reportProOfferClick: vi.fn(),
  reportProCtaClick: vi.fn(),
}));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
const LOUD_FILL = /^bg-neo-(lime|yellow|cyan|pink)$/;

function renderBossWall(status: 'defeated' | 'escaped') {
  useClassroomBossStore.getState().receiveState(sampleBossView(status));
  const { summary, players } = samplePreviewRound('winner');
  const view = render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} onClose={vi.fn()} onExitRoom={vi.fn()} />);
  act(() => {
    vi.advanceTimersByTime(8000);
  });
  return view;
}

describe('EduHostResults: boss round on the teacher wall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    screenSize.phone = false;
    pro.hasPro = false;
    useClassroomBossStore.getState().reset();
  });
  afterEach(() => {
    useClassroomBossStore.getState().reset();
    vi.useRealTimers();
  });

  it.each(['defeated', 'escaped'] as const)('given the boss %s, then the only lime fill on the wall is the primary action', (status) => {
    const { container } = renderBossWall(status);
    const lime = [...container.querySelectorAll('[class]')].filter((el) => tokens(el).includes('bg-neo-lime'));
    expect(lime.map((el) => el.getAttribute('data-testid'))).toEqual(['edu-results-play-again']);
    expect(container.innerHTML).not.toMatch(/\btext-neo-lime\b/);
  });

  it('given the class chest opens, then its label sits on a neutral surface', () => {
    renderBossWall('defeated');
    const label = screen.getByTestId('class-chest-label');
    expect(tokens(label).filter((c) => LOUD_FILL.test(c))).toEqual([]);
    expect(tokens(label)).toContain('bg-neo-navy-light');
  });

  it('given the boss got away, then the wall card is compact and still says the outcome, damage, health left, blocks and top hitters', () => {
    renderBossWall('escaped');
    const card = screen.getByTestId('boss-outcome');
    expect(card).toHaveAttribute('data-density', 'compact');
    expect(card.innerHTML).toMatch(/classroomBoss\.escaped/);
    expect(card.innerHTML).toMatch(/classroomBoss\.dealtPct/);
    expect(screen.getByTestId('boss-hp-left')).toBeInTheDocument();
    expect(screen.getByTestId('boss-staggers')).toBeInTheDocument();
    expect(screen.getAllByTestId('boss-top-hitter')).toHaveLength(3);
    const loud = [...card.querySelectorAll('[class]')].filter((el) => tokens(el).some((c) => LOUD_FILL.test(c)));
    expect(loud).toEqual([]);
  });

  it('given a boss round on a phone, then the podium alone names the top scorer and the winner bar steps aside', () => {
    screenSize.phone = true;
    renderBossWall('escaped');
    expect(tokens(screen.getByTestId('winner-spotlight'))).toContain('hidden');
  });

  it('given a boss round on the wall, then the winner bar still shows', () => {
    renderBossWall('escaped');
    expect(tokens(screen.getByTestId('winner-spotlight'))).not.toContain('hidden');
  });

  it('given a student phone, then the defeated boss card keeps its lime win fill', () => {
    useClassroomBossStore.getState().receiveState(sampleBossView('defeated'));
    render(<BossOutcomeCard size="phone" />);
    const card = screen.getByTestId('boss-outcome');
    expect(tokens(card)).toContain('bg-neo-lime');
    expect(card).not.toHaveAttribute('data-density', 'compact');
  });

  it('given a Pro teacher on a phone, then the podium keeps the small phone size so the who-struggled preview fits under it', () => {
    screenSize.phone = true;
    pro.hasPro = true;
    const { summary, players } = samplePreviewRound('winner');
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    expect(tokens(screen.getByTestId('podium-stage'))).toContain('w-[min(100%,14rem)]');
  });

  it('given a Pro teacher hosting from a phone, then the colleague invite is a compact row with WhatsApp', () => {
    screenSize.phone = true;
    pro.hasPro = true;
    const { summary, players } = samplePreviewRound('winner', { count: 30 });
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByTestId('teacher-invite')).toHaveAttribute('data-density', 'compact');
    expect(screen.getByTestId('teacher-invite-whatsapp')).toBeInTheDocument();
  });
});
