/**
 * Howler's Howl._loadQueue drains its action queue by RECURSION:
 * volume() succeeds → _emit('volume') → _loadQueue('volume') → shift →
 * _loadQueue() → task.action() → volume() → _emit('volume') → …
 * Every volume()/fade() call made while the Howl is play-locked or still
 * loading queues one task, so a long lock (slow play() promise, suspended
 * AudioContext) plus slider drags builds a queue of hundreds; the first
 * successful volume() then cascades through all of them in one synchronous
 * recursion and blows the stack.
 *
 * Regression: Sentry JAVASCRIPT-NEXTJS (issue 149131810) —
 * RangeError: Maximum call stack size exceeded at Howl.volume.
 *
 * The fix replaces the recursive drain with an iterative one (see
 * patchHowlerLoadQueueRecursion in ../audioLoader).
 */
import { describe, it, expect } from 'vitest';
import { ensureHowl } from '../audioLoader';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

type RiggedHowl = {
  _state: string;
  _playLock: boolean;
  _sounds: { _id: number; _volume: number; _node: null; _muted: boolean }[];
  _queue: { event: string; action: () => void }[];
};

describe('ensureHowl — _loadQueue recursion (issue 149131810)', () => {
  it('drains a deep volume queue without a stack overflow', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({ src: [SILENT_WAV], html5: true, preload: false });
    const rig = howl as unknown as RiggedHowl;

    // Rig the Howl as a loaded html5 Howl with one sound so volume() takes the
    // success path (and emits 'volume') once the lock is released.
    rig._state = 'loaded';
    rig._sounds = [{ _id: 1, _volume: 0.5, _node: null, _muted: false }];

    // While play-locked, every volume() call just queues a task — this is what
    // slider drags / fade timeouts do during a slow play().
    rig._playLock = true;
    const QUEUE_DEPTH = 5000;
    for (let i = 0; i < QUEUE_DEPTH; i++) howl.volume(0.7);
    expect(rig._queue.length).toBe(QUEUE_DEPTH);

    rig._playLock = false;
    // The first unlocked volume() triggers the cascade. Recursive drain:
    // RangeError. Iterative drain: completes with the queue empty.
    expect(() => howl.volume(0.8)).not.toThrow();
    expect(rig._queue.length).toBe(0);
    // The 5000 queued 0.7 actions flush after the direct 0.8 call, so the
    // final volume is the last queued task's value (howler semantics).
    expect(howl.volume()).toBe(0.7);
  });

  it('keeps howler semantics: actions that re-queue (still locked) stay queued', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({ src: [SILENT_WAV], html5: true, preload: false });
    const rig = howl as unknown as RiggedHowl;

    rig._state = 'loaded';
    rig._sounds = [{ _id: 1, _volume: 0.5, _node: null, _muted: false }];
    rig._playLock = true;
    howl.volume(0.9);
    expect(rig._queue.length).toBe(1);

    // A drain attempt while still locked must not run the task away: the
    // action re-queues and the task remains for a later event.
    (howl as unknown as { _loadQueue: (event?: string) => void })._loadQueue();
    expect(rig._queue.length).toBeGreaterThan(0);
    expect(howl.volume()).not.toBe(0.9);
  });
  it('drains volume/fade queued behind a play-lock once the play promise settles', async () => {
    const Howl = await ensureHowl();
    const howl = new Howl({ src: [SILENT_WAV], html5: true, preload: false });
    const rig = howl as unknown as RiggedHowl & { _emit: (e: string, id?: number) => void };

    rig._state = 'loaded';
    rig._sounds = [{ _id: 1, _volume: 0, _node: null, _muted: false }];

    rig._playLock = true;
    howl.volume(0.6);
    expect(rig._queue.map((t) => t.event)).toEqual(['volume']);

    // html5 play().then() releases the lock and emits 'play' — the queued head
    // is 'volume', so stock howler leaves it stuck and the track stays silent.
    rig._playLock = false;
    rig._emit('play', 1);

    expect(rig._queue.length).toBe(0);
    expect(howl.volume()).toBe(0.6);
  });
});
