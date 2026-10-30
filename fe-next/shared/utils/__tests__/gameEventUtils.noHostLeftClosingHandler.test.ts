import * as gameEventUtils from '../gameEventUtils';

describe('gameEventUtils exports', () => {
  it('no longer exports the unused host-left room-closing handler', () => {
    expect('createHostLeftRoomClosingHandler' in gameEventUtils).toBe(false);
  });
});
