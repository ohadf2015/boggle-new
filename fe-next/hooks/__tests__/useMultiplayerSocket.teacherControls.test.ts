import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * useMultiplayerSocket — teacher live-controls contract.
 *
 * Source-level pins (same style as the sibling contract tests): the hook must
 * (1) listen for the pause/resume/extend events and drive the shared pause
 * store, (2) derive pause state from EVERY `startGame` payload so a reconnect
 * mid-pause lands on the pause and a fresh round clears a stale one, and
 * (3) expose emitters for the teacher controls.
 */
const source = readFileSync(resolve(__dirname, '../useMultiplayerSocket.ts'), 'utf8');

describe('useMultiplayerSocket — teacher live controls', () => {
  it('listens for gamePaused / gameResumed / timeExtended / wordHuntTargetSkipped / teacherControlRejected', () => {
    for (const ev of ['gamePaused', 'gameResumed', 'timeExtended', 'wordHuntTargetSkipped', 'teacherControlRejected']) {
      expect(source).toMatch(new RegExp(`socketInstance\\.on\\('${ev}'`));
      // …and cleans them up via the eventNames blanket-off (they are owned solely by this hook)
      const start = source.indexOf('const eventNames = [');
      const arrayLiteral = source.slice(start, source.indexOf(']', start) + 1);
      expect(arrayLiteral).toContain(`'${ev}'`);
    }
  });

  it('drives the shared pause store from gamePaused / gameResumed', () => {
    const paused = source.slice(source.indexOf("socketInstance.on('gamePaused'"));
    expect(paused.slice(0, 400)).toMatch(/setTeacherPaused\(true\)/);
    const resumed = source.slice(source.indexOf("socketInstance.on('gameResumed'"));
    expect(resumed.slice(0, 400)).toMatch(/setTeacherPaused\(false\)/);
  });

  it('derives pause state from every startGame payload (reconnect mid-pause + fresh-round reset)', () => {
    const handler = source.slice(source.indexOf("socketInstance.on('startGame'"));
    expect(handler.slice(0, 900)).toMatch(/setTeacherPaused\(!!data\.isPaused\)/);
  });

  it('clears the pause on resetGame', () => {
    const handler = source.slice(source.indexOf("socketInstance.on('resetGame'"));
    expect(handler.slice(0, 600)).toMatch(/setTeacherPaused\(false\)/);
  });

  it('exposes isPaused and the teacher emitters', () => {
    const ret = source.slice(source.lastIndexOf('return {'));
    for (const key of ['isPaused', 'pauseGame', 'resumeGame', 'extendTime', 'endRoundNow', 'skipTargetWord']) {
      expect(ret).toMatch(new RegExp(`\\b${key}\\b`));
    }
    expect(source).toMatch(/emit\('pauseGame'\)/);
    expect(source).toMatch(/emit\('resumeGame'\)/);
    expect(source).toMatch(/emit\('extendTime',\s*\{\s*seconds/);
    expect(source).toMatch(/emit\('endRoundNow'\)/);
    expect(source).toMatch(/emit\('skipTargetWord'\)/);
  });
});
