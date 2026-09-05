import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * useMultiplayerSocket — classroom differentiation contract.
 *
 * The server emits a per-socket `classroomContext` { classroomLevel, classroomWordBank }
 * from the `join` path (first join, late join, reconnect). The hook must keep both
 * values in state, expose them, and reset them on a fresh `joined` so a value from a
 * previous (classroom) room never leaks into the next (non-classroom) one.
 */
const source = readFileSync(resolve(__dirname, '../useMultiplayerSocket.ts'), 'utf8');

describe('useMultiplayerSocket — classroomContext', () => {
  it('listens for classroomContext and stores level + word bank', () => {
    const start = source.indexOf("socketInstance.on('classroomContext'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, start + 900);
    expect(body).toMatch(/setClassroomLevel\(/);
    expect(body).toMatch(/setClassroomWordBank\(/);
  });

  it('exposes classroomLevel and classroomWordBank from the hook', () => {
    const ret = source.slice(source.lastIndexOf('  return {'));
    expect(ret).toMatch(/\bclassroomLevel,/);
    expect(ret).toMatch(/\bclassroomWordBank,/);
    expect(source).toMatch(/classroomLevel:\s*VocabularyLevel;/);
    expect(source).toMatch(/classroomWordBank:\s*string\[\];/);
  });

  it("resets to core / [] when a new room is joined (no stale value from the previous room)", () => {
    const joinedStart = source.indexOf("socketInstance.on('joined'");
    const joinedBody = source.slice(joinedStart, joinedStart + 700);
    expect(joinedBody).toMatch(/setClassroomLevel\('core'\)/);
    expect(joinedBody).toMatch(/setClassroomWordBank\(\[\]\)/);
  });

  it('is torn down with the other MP-exclusive events (no listener accumulation on re-register)', () => {
    const listStart = source.indexOf('const eventNames = [');
    const listBody = source.slice(listStart, source.indexOf('];', listStart));
    expect(listBody).toMatch(/'classroomContext'/);
  });

  it("only accepts a known level; anything else degrades to 'core'", () => {
    const start = source.indexOf("socketInstance.on('classroomContext'");
    const body = source.slice(start, start + 900);
    expect(body).toMatch(/isVocabularyLevel\(/);
  });
});
