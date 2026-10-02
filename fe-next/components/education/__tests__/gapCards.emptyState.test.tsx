import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { MissGapPracticeCard } from '../MissGapPracticeCard';
import { MissGapGradePassback } from '../MissGapGradePassback';
import { MissGapWhatsAppShareCard } from '../MissGapWhatsAppShareCard';
import { MissGapAsyncAssignment } from '../MissGapAsyncAssignment';
import { ClassicUnpluggedLive } from '../ClassicUnpluggedLive';
import { UnpluggedReteachLive } from '../UnpluggedReteachLive';
import { TeamTilesUnpluggedLive } from '../TeamTilesUnpluggedLive';
import { UnpluggedReteachGradePassback } from '../UnpluggedReteachGradePassback';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }) }));
vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireStreakConfetti: vi.fn() }));
vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({ openMissedWordsPracticeSheet: vi.fn() }));
vi.mock('@/lib/education/unpluggedReteachPrintablePack', () => ({ openUnpluggedReteachPrintablePack: vi.fn() }));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: vi.fn() }));

const base = { locale: 'en' as const, lesson: '', teacher: '', dueDate: '', definitions: {} };
const noData = { ...base, found: 0, total: 0, missedWords: [] as string[] };
const sweep = { ...base, found: 5, total: 5, missedWords: [] as string[] };

const CARDS: Array<[string, ComponentType<any>]> = [
  ['MissGapPracticeCard', MissGapPracticeCard],
  ['MissGapGradePassback', MissGapGradePassback],
  ['MissGapWhatsAppShareCard', MissGapWhatsAppShareCard],
  ['MissGapAsyncAssignment', MissGapAsyncAssignment],
  ['ClassicUnpluggedLive', ClassicUnpluggedLive],
  ['UnpluggedReteachLive', UnpluggedReteachLive],
  ['TeamTilesUnpluggedLive', TeamTilesUnpluggedLive],
  ['UnpluggedReteachGradePassback', UnpluggedReteachGradePassback],
];

describe('gap cards opened with no class data', () => {
  it.each(CARDS)('%s does not claim the class found every word', (_name, Card) => {
    render(<Card payload={noData} />);
    expect(screen.queryByText('education.results.allFound')).toBeNull();
    expect(screen.getByText('eg2Fix.gap.empty')).toBeInTheDocument();
  });

  it.each(CARDS)('%s still celebrates a real sweep', (_name, Card) => {
    render(<Card payload={sweep} />);
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
  });
});

describe('unplugged pages opened with no class data', () => {
  const LIVE: Array<[string, ComponentType<any>, string]> = [
    ['ClassicUnpluggedLive', ClassicUnpluggedLive, 'education.results.classicUnpluggedExit'],
    ['UnpluggedReteachLive', UnpluggedReteachLive, 'education.results.unpluggedGameExit'],
    ['TeamTilesUnpluggedLive', TeamTilesUnpluggedLive, 'education.results.teamTilesExit'],
  ];

  it.each(LIVE)('%s offers a back link', (_name, Live, exitLabel) => {
    render(<Live payload={noData} educationHref="/en/teacher" />);
    expect(screen.getByRole('link', { name: exitLabel })).toHaveAttribute('href', '/en/teacher');
  });
});
