import { isHeavyGamePath, stripLocalePrefix } from '../heavyGamePath';

describe('isHeavyGamePath', () => {
  it('treats /singleplayer (with and without locale) as heavy', () => {
    expect(isHeavyGamePath('/singleplayer')).toBe(true);
    expect(isHeavyGamePath('/en/singleplayer')).toBe(true);
    expect(isHeavyGamePath('/he/singleplayer')).toBe(true);
  });

  it('does not treat home, blog, or teacher as heavy', () => {
    expect(isHeavyGamePath('/')).toBe(false);
    expect(isHeavyGamePath('/en')).toBe(false);
    expect(isHeavyGamePath('/en/blog')).toBe(false);
    expect(isHeavyGamePath('/en/teacher')).toBe(false);
    expect(isHeavyGamePath(null)).toBe(false);
  });

  it('strips a single locale prefix only', () => {
    expect(stripLocalePrefix('/en/singleplayer')).toBe('/singleplayer');
    expect(stripLocalePrefix('/en')).toBe('/');
  });
});
