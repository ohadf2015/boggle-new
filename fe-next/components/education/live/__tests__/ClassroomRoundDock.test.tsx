import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/components/education/economy/ClassroomStudentDock', () => ({
  default: () => <div data-testid="economy-dock" />,
}));

import { ClassroomRoundDock } from '../ClassroomRoundDock';
import { ingestLessonClaimsRound } from '../useLessonClaims';
import { useClassroomContextStore } from '@/hooks/gameState/classroomContextStore';
import { MpRoundTrayContext } from '@/components/multiplayer/round/MpRoundTray';

function fakeSocket() {
  const handlers: Record<string, Array<(d: unknown) => void>> = {};
  return {
    socket: {
      on: (e: string, fn: (d: unknown) => void) => { (handlers[e] ??= []).push(fn); },
      off: (e: string, fn: (d: unknown) => void) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn); },
      emit: () => undefined,
    },
    fire: (e: string, d: unknown) => act(() => { (handlers[e] ?? []).forEach((h) => h(d)); }),
  };
}

const race = { roundId: 2, total: 2, claimedCount: 0, slots: [{ index: 0, first: 'S', length: 5, claim: null }, { index: 1, first: 'C', length: 4, claim: null }] };
const duel = { gameSessionId: 2, rival: { rivalName: 'Dana', rivalAvatar: null, myScore: 3, rivalScore: 7 } };

function renderDock() {
  const s = fakeSocket();
  render(<ClassroomRoundDock gameCode="ABC" socket={s.socket as never} me="Noa" />);
  s.fire('rivalUpdate', duel);
  return screen.getByTestId('classroom-round-dock');
}

const isBefore = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('ClassroomRoundDock: the one row under the grid', () => {
  beforeEach(() => {
    act(() => {
      ingestLessonClaimsRound({ lessonClaims: race });
      useClassroomContextStore.setState({ level: 'core', wordBank: ['storm', 'cell'] });
    });
  });

  it('Given a race and a rival, When the round runs, Then chip and race strip share one row above the economy dock and nothing is pinned over the screen', () => {
    const dock = renderDock();
    const row = screen.getByTestId('classroom-round-row');
    const chip = screen.getByTestId('rival-chip');
    const strip = screen.getByTestId('lesson-target-strip');
    expect(row).toContainElement(chip);
    expect(row).toContainElement(strip);
    expect(isBefore(chip, strip)).toBe(true);
    expect(isBefore(row, screen.getByTestId('economy-dock'))).toBe(true);
    for (const el of dock.querySelectorAll('*')) expect((el as HTMLElement).className?.toString() ?? '').not.toMatch(/\bfixed\b/);
    expect(row.className).toMatch(/pointer-events-none/);
  });

  it('Given a support student holding the word bank, When a race round runs, Then the race strip is left out, the bank keeps the bottom, and the dock clears it', () => {
    act(() => { useClassroomContextStore.setState({ level: 'support', wordBank: ['storm', 'cell'] }); });
    const dock = renderDock();
    expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
    expect(screen.getByTestId('rival-chip')).toBeInTheDocument();
    expect(dock.className).toMatch(/pb-\[calc\(3\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  });

  it('Given a phone tray with a lead slot, When the round runs, Then the chip and race row move to that slot and the economy stays in the dock', () => {
    const lead = document.createElement('div');
    document.body.appendChild(lead);
    const s = fakeSocket();
    render(
      <MpRoundTrayContext.Provider value={{ registerSlot: () => undefined, dockNode: null, leadNode: lead }}>
        <ClassroomRoundDock gameCode="ABC" socket={s.socket as never} me="Noa" />
      </MpRoundTrayContext.Provider>,
    );
    s.fire('rivalUpdate', duel);
    expect(lead).toContainElement(screen.getByTestId('classroom-round-row'));
    expect(screen.getByTestId('classroom-round-dock')).toContainElement(screen.getByTestId('economy-dock'));
    expect(screen.getByTestId('classroom-round-dock')).not.toContainElement(screen.getByTestId('rival-chip'));
    lead.remove();
  });

  it('Given no race and no rival, When rendered, Then only the economy dock shows', () => {
    act(() => { ingestLessonClaimsRound({}); });
    render(<ClassroomRoundDock gameCode="ABC" socket={fakeSocket().socket as never} me="Noa" />);
    expect(screen.getByTestId('classroom-round-row')).toBeEmptyDOMElement();
    expect(screen.getByTestId('economy-dock')).toBeInTheDocument();
  });
});
