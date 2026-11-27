import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, fb?: string) => fb ?? k }) }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));

import { BlastLoadingGate } from '../BlastLoadingGate';
import { BlastTileFirstUseCallout } from '../BlastTileFirstUseCallout';

const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|text-neo-lime(\s|$)/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');

function gate(classroom: boolean) {
  vi.useFakeTimers();
  const { container } = render(
    <ClassroomBoardProvider value={classroom}>
      <BlastLoadingGate gridReady={false} dictionaryReady={false} mode="mp" language="en" t={(k: string) => k} onDictionaryRetry={vi.fn()} onGridRetry={vi.fn()} onBackToLobby={vi.fn()} />
    </ClassroomBoardProvider>,
  );
  act(() => { vi.advanceTimersByTime(60_000); });
  return container.firstElementChild!;
}

function callout(classroom: boolean) {
  const { container } = render(<ClassroomBoardProvider value={classroom}><BlastTileFirstUseCallout type="bomb" onDismiss={vi.fn()} isMultiplayer /></ClassroomBoardProvider>);
  return container.firstElementChild!;
}

describe('Blast join and tip overlays in a classroom round', () => {
  afterEach(() => vi.useRealTimers());

  it('arcade: the loading gate (fresh join and reconnect) keeps its exact classes', () => {
    expect(classesOf(gate(false))).toMatchSnapshot();
  });

  it('arcade: the first-use tile tip keeps its exact classes', () => {
    expect(classesOf(callout(false))).toMatchSnapshot();
  });

  it('classroom: the loading gate reads in page ink on the sky page', () => {
    expect(classesOf(gate(true)).filter((c) => DARK.test(c))).toEqual([]);
  });

  it('classroom: the first-use tile tip is a cream card', () => {
    const root = callout(true);
    expect(classesOf(root).join(' ')).toContain('bg-edu-surface');
    expect(classesOf(root).filter((c) => DARK.test(c))).toEqual([]);
  });
});
