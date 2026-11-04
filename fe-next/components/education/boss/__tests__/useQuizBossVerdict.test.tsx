import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EventEmitter } from 'events';
import type { Socket } from 'socket.io-client';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { quizBossView, useQuizBossVerdict } from '../useQuizBossVerdict';

function fakeSocket() {
  const bus = new EventEmitter();
  return Object.assign(bus, {
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
  }) as unknown as Socket & EventEmitter;
}

beforeEach(() => useClassroomBossStore.getState().reset());

describe('quizBossView', () => {
  it('turns a felled quiz boss into the defeated verdict the recap reads', () => {
    expect(quizBossView({ maxHp: 40, hp: 0, lastHits: 3, defeated: true })).toMatchObject({
      status: 'defeated', hp: 0, maxHp: 40, pctDealt: 100,
    });
  });

  it('turns a surviving quiz boss into the escaped verdict with the damage dealt', () => {
    expect(quizBossView({ maxHp: 40, hp: 10, lastHits: 0, defeated: false })).toMatchObject({
      status: 'escaped', hp: 10, pctDealt: 75,
    });
  });
});

describe('useQuizBossVerdict', () => {
  it('puts a quiz Boss Battle verdict on the shared recap', () => {
    const socket = fakeSocket();
    renderHook(() => useQuizBossVerdict(socket));

    act(() => { socket.emit('validatedScores', { classroomSummary: {}, vocabQuizBoss: { maxHp: 20, hp: 0, lastHits: 2, defeated: true } }); });

    expect(useClassroomBossStore.getState().view?.status).toBe('defeated');
  });

  it('ignores a plain quiz or a board round', () => {
    const socket = fakeSocket();
    renderHook(() => useQuizBossVerdict(socket));

    act(() => { socket.emit('validationComplete', { classroomSummary: {} }); });

    expect(useClassroomBossStore.getState().view).toBeNull();
  });

  it('clears its own verdict when the next round starts, so a plain round recap shows no boss', () => {
    const socket = fakeSocket();
    renderHook(() => useQuizBossVerdict(socket));
    act(() => { socket.emit('validationComplete', { vocabQuizBoss: { maxHp: 20, hp: 5, lastHits: 0, defeated: false } }); });

    act(() => { socket.emit('startGame', {}); });

    expect(useClassroomBossStore.getState().view).toBeNull();
  });

  it('leaves a board Boss Battle that is already live alone', () => {
    const socket = fakeSocket();
    renderHook(() => useQuizBossVerdict(socket));
    act(() => { socket.emit('validationComplete', { vocabQuizBoss: { maxHp: 20, hp: 5, lastHits: 0, defeated: false } }); });
    const boardView = { ...quizBossView({ maxHp: 90, hp: 90, lastHits: 0, defeated: false }), status: 'fighting' as const };
    act(() => { useClassroomBossStore.getState().receiveState(boardView); });

    act(() => { socket.emit('startGame', {}); });

    expect(useClassroomBossStore.getState().view).toBe(boardView);
  });
});
