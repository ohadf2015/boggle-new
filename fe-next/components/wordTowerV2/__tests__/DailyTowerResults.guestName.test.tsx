import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { createRun } from '@/lib/wordTowerV2/run';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/word-tower/daily',
  useSearchParams: () => new URLSearchParams(),
}));
const slot = vi.hoisted(() => ({ props: null as null | { rank?: number | null; t: (k: string, f?: unknown, p?: unknown) => string; onRenamed: (n: string) => void } }));
vi.mock('@/components/daily/results/DailyGuestNameSlot', () => ({
  DailyGuestNameSlot: (p: NonNullable<typeof slot.props>) => {
    slot.props = p;
    return <div data-testid="guest-name-slot" />;
  },
}));

import { V2Results } from '../V2Results';

afterEach(cleanup);
beforeEach(() => {
  slot.props = null;
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

let boardMounts = 0;
function Board() {
  useEffect(() => {
    boardMounts += 1;
  }, []);
  return <div data-testid="tower-board" />;
}

const renderDaily = () =>
  render(
    <LanguageProvider initialLanguage="en">
      <V2Results
        t={t}
        peakM={18}
        score={2400}
        bestM={30}
        isBest={false}
        run={{ ...createRun(1), floors: 6, bestCombo: 4, tenants: 23, crates: 3 }}
        badges={[]}
        unlocked={new Set<string>()}
        onRestart={() => {}}
        onHome={() => {}}
        onClose={() => {}}
        daily={{ growthM: 12, targetM: 15, totalM: 96, rank: 4 }}
        boardSlot={<Board />}
      />
    </LanguageProvider>,
  );

describe('Daily tower results — guest name', () => {
  it('Given the daily results, Then the guest name slot sits above the board with today\'s rank', () => {
    renderDaily();
    const nameSlot = screen.getByTestId('guest-name-slot');
    const board = screen.getByTestId('tower-board');
    expect(nameSlot.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.props?.rank).toBe(4);
  });

  it('Given a guest renames, Then the board reloads so the new name shows', () => {
    boardMounts = 0;
    renderDaily();
    expect(boardMounts).toBe(1);
    act(() => slot.props?.onRenamed('Ohad'));
    expect(boardMounts).toBe(2);
  });

  it('Given the editor asks for a key with an English fallback, Then the tower translator gets the params, not the fallback', () => {
    renderDaily();
    expect(slot.props?.t('wordHunt.results.guestNameDefaultNudge', 'fallback {name}', { name: 'X' })).toBe('wordHunt.results.guestNameDefaultNudge:X');
    expect(slot.props?.t('playerView.editName', 'Change name')).toBe('playerView.editName');
  });
});
