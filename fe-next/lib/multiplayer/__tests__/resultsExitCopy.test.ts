import { describe, it, expect } from 'vitest';
import { resultsExitCopy } from '../resultsExitCopy';

describe('resultsExitCopy', () => {
  it('a classroom host leaves "back to class" and is told, once, that the room closes for everyone', () => {
    expect(resultsExitCopy({ isClassroom: true, isHost: true })).toEqual({
      leaveKey: 'mpUi.results.backToClass',
      titleKey: 'mpUi.results.endClassTitle',
      bodyKey: 'mpUi.results.endClassBody',
    });
  });

  it('everyone else keeps the arcade copy', () => {
    const arcade = { leaveKey: 'mpUi.results.leave', titleKey: 'playerView.exitConfirmation', bodyKey: 'results.exitWarning' };
    expect(resultsExitCopy({ isClassroom: false, isHost: true })).toEqual(arcade);
    expect(resultsExitCopy({ isClassroom: true, isHost: false })).toEqual(arcade);
  });
});
