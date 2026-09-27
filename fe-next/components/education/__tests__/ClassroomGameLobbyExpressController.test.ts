/**
 * Why a launch does not live inside a React effect.
 *
 * Measured live on 2026-09-11: the express screen sat on "Setting up your
 * class" forever while the network log showed the classroom AND the lesson had
 * both been created. React's dev double-mount had run the effect's cleanup
 * between them, so the flag that says "this run is stale" was set on a run
 * that was the only one there was — every later step wrote into nothing and
 * the room was never asked for. A mount is the wrong lifetime for a side
 * effect that ends in a navigation.
 *
 * So the launch is keyed by the intent, lives above the component, and a
 * second mount SUBSCRIBES to the run already in flight instead of starting or
 * cancelling one (pitfalls class 4 — the visible symptom was a silent spinner).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ensureLaunch,
  getLaunch,
  subscribeLaunch,
  abandonLaunch,
  resetLaunchesForTest,
} from '../ClassroomGameLobbyExpressController';

describe('express launch controller', () => {
  beforeEach(() => resetLaunchesForTest());

  it('runs the launch once per key, however many times it is mounted', () => {
    const start = vi.fn();
    ensureLaunch('k1', start);
    ensureLaunch('k1', start);
    ensureLaunch('k1', start);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('keeps a run alive across an unmount and hands its state to the next mount', () => {
    ensureLaunch('k1', (ctl) => ctl.setStage('lesson'));
    // The first mount goes away entirely.
    expect(getLaunch('k1')?.stage).toBe('lesson');
    ensureLaunch('k1', () => { throw new Error('must not restart'); });
    expect(getLaunch('k1')?.stage).toBe('lesson');
  });

  it('notifies subscribers on every state change and stops after unsubscribe', () => {
    const seen: string[] = [];
    let ctl!: Parameters<Parameters<typeof ensureLaunch>[1]>[0];
    ensureLaunch('k1', (c) => { ctl = c; });
    const off = subscribeLaunch('k1', () => seen.push(getLaunch('k1')!.stage));
    ctl.setStage('lesson');
    ctl.setStage('room');
    off();
    ctl.setStage('classroom');
    expect(seen).toEqual(['lesson', 'room']);
  });

  it('records a success with the code the server confirmed', () => {
    let ctl!: Parameters<Parameters<typeof ensureLaunch>[1]>[0];
    ensureLaunch('k1', (c) => { ctl = c; });
    ctl.succeed('ABC234');
    expect(getLaunch('k1')).toMatchObject({ gameCode: 'ABC234', failure: null });
  });

  it('records a failure once — a later rejection cannot overwrite the first cause', () => {
    let ctl!: Parameters<Parameters<typeof ensureLaunch>[1]>[0];
    ensureLaunch('k1', (c) => { ctl = c; });
    ctl.fail({ code: 'classroom', reason: 'CLASS_LIMIT_REACHED' });
    ctl.fail({ code: 'room', reason: 'TIMEOUT' });
    expect(getLaunch('k1')?.failure).toEqual({ code: 'classroom', reason: 'CLASS_LIMIT_REACHED' });
  });

  it('ignores state written after a success — a late timeout must not blank the room', () => {
    let ctl!: Parameters<Parameters<typeof ensureLaunch>[1]>[0];
    ensureLaunch('k1', (c) => { ctl = c; });
    ctl.succeed('ABC234');
    ctl.fail({ code: 'room', reason: 'TIMEOUT' });
    expect(getLaunch('k1')).toMatchObject({ gameCode: 'ABC234', failure: null });
  });

  it('runs the cleanup it was given exactly once when the launch is abandoned', () => {
    const cleanup = vi.fn();
    ensureLaunch('k1', (ctl) => ctl.onDispose(cleanup));
    abandonLaunch('k1');
    abandonLaunch('k1');
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(getLaunch('k1')).toBeUndefined();
  });

  it('lets a retry under a new key start a fresh run', () => {
    const start = vi.fn();
    ensureLaunch('k1:0', start);
    ensureLaunch('k1:1', start);
    expect(start).toHaveBeenCalledTimes(2);
  });
});
