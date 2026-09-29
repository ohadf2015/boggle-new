import { readMpPageSource } from './mpPageSource';

/**
 * The classroom-detection wiring is load-bearing and untestable by render
 * (provider-wrapped app shell), so this guards it by contract on the source,
 * same as PageClient.classroomRoomGone.test.ts. The wiring now lives in the
 * split files (`useMpPageState.ts` for detection, `useMpRoomSocket.ts` for the
 * deferring socket decisions), so the contracts read their concatenation via
 * readMpPageSource:
 *
 *  (a) the live-game fetch is enabled for EVERY room — gating it on
 *      `?classroom=true` is the original mis-detection bug (a student who typed
 *      a classroom code into the arcade lobby had no flag and no fetch);
 *  (b) the fetch's tri-state feeds the classroom decisions through the pure
 *      `resolveClassroomContext`/`hostTransferAction`/`roomGoneAction`
 *      (unit-tested in lib/education/__tests__/classroomRoomGone.test.ts);
 *  (c) a host transfer or room-gone that lands while the record is pending is
 *      DEFERRED, never resolved with an optimistic arcade default (pitfall
 *      class 1) — a classroom student must not be permanently promoted to host
 *      inside the fetch window.
 */
const source = readMpPageSource();

describe('PageClient — classroom context detection wiring', () => {
  it('fetches the live-game record for every room, not only ?classroom=true ones', () => {
    expect(source).toMatch(/useClassroomLiveGame\(gameCode \|\| prefilledRoomCode, true\)/);
    // The regression shape: the enabled flag derived from the URL param.
    expect(source).not.toMatch(/useClassroomLiveGame\(gameCode \|\| prefilledRoomCode, isClassroomMode\)/);
    expect(source).not.toMatch(/useLiveClassroomGameInfo\(gameCode \|\| prefilledRoomCode, isClassroomMode\)/);
  });

  it('derives the classroom context from the URL flag AND the record status', () => {
    expect(source).toMatch(/resolveClassroomContext\(\{\s*urlClassroom: isClassroomMode,\s*recordStatus/);
  });

  it('routes host transfers through hostTransferAction and defers while pending', () => {
    const transferred = source.match(/onHostTransferred:[\s\S]{0,900}?\n {4}(?=\w)/);
    expect(transferred, 'onHostTransferred handler not found').toBeTruthy();
    expect(transferred?.[0]).toMatch(/hostTransferAction\(/);
    expect(transferred?.[0]).toMatch(/defer/);
    // A deferred transfer must be flushed once the record resolves.
    expect(source).toMatch(/deferredHostTransfer/);
  });

  it('routes room-gone through roomGoneAction and defers while pending', () => {
    expect(source).toMatch(/roomGoneAction\(/);
    expect(source).toMatch(/deferredRoomGone/);
  });

  it('flushes deferred room-gone even when a deferred host transfer navigates first', () => {
    // If both events parked during the same pending window and the transfer
    // flush exits to the hub, an early `return` would strand deferredRoomGone
    // — no toast, no URL strip, no session clear. The two flushes must be
    // independent.
    const flush = source.match(/Flush decisions parked[\s\S]{0,1200}?deferredRoomGoneRef\.current = null;/);
    expect(flush, 'flush effect not found').toBeTruthy();
    expect(flush?.[0]).not.toMatch(/exitClassroomStudentToHub\(\);\s*return;/);
  });
});
