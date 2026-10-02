import { isHeavyGamePath, rendersSiteChrome, stripLocalePrefix } from '../heavyGamePath';

describe('rendersSiteChrome', () => {
  it('renders site chrome on the daily hub in every locale', () => {
    for (const p of ['/daily', '/en/daily', '/he/daily', '/sv/daily', '/ja/daily', '/es/daily', '/ru/daily', '/en/daily/']) {
      expect(rendersSiteChrome(p)).toBe(true);
    }
  });

  it('keeps site chrome off daily play routes and other fullscreen game shells', () => {
    expect(rendersSiteChrome('/en/daily/word-hunt')).toBe(false);
    expect(rendersSiteChrome('/he/daily/word-wheel')).toBe(false);
    expect(rendersSiteChrome('/en/singleplayer')).toBe(false);
  });

  it('renders site chrome on non-game pages', () => {
    expect(rendersSiteChrome('/en')).toBe(true);
    expect(rendersSiteChrome('/en/blog')).toBe(true);
    expect(rendersSiteChrome(null)).toBe(true);
  });

  it('leaves /daily heavy for the perf deferrals', () => {
    expect(isHeavyGamePath('/en/daily')).toBe(true);
  });
});

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
