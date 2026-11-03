import { localeSwitchPath } from '../localeSwitchPath';

describe('localeSwitchPath', () => {
  it('keeps the room code when a student switches language mid-join', () => {
    expect(localeSwitchPath('/en/education/live', 'he', '?room=ABC')).toBe('/he/education/live?room=ABC');
  });

  it('keeps ?from= on the access page', () => {
    expect(localeSwitchPath('/en/education/access', 'ru', '?from=teacher')).toBe('/ru/education/access?from=teacher');
  });

  it('swaps the locale on a bare locale home', () => {
    expect(localeSwitchPath('/en', 'ja', '')).toBe('/ja');
  });

  it('prefixes a path that has no locale yet', () => {
    expect(localeSwitchPath('/student/join', 'es', '?code=X')).toBe('/es/student/join?code=X');
    expect(localeSwitchPath(null, 'sv', null)).toBe('/sv');
  });
});
