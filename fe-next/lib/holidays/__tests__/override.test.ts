import { describe, expect, it } from 'vitest';
import { HOLIDAY_COOKIE, holidayCookie, parseOverride, readOverrideCookie } from '../override';

describe('parseOverride', () => {
  it('accepts the three values and rejects the rest', () => {
    expect(parseOverride('hanukkah')).toBe('hanukkah');
    expect(parseOverride('christmas')).toBe('christmas');
    expect(parseOverride('off')).toBe('off');
    expect(parseOverride('easter')).toBeNull();
    expect(parseOverride(null)).toBeNull();
    expect(parseOverride(undefined)).toBeNull();
  });
});

describe('readOverrideCookie', () => {
  it('reads lx_holiday out of a cookie string', () => {
    expect(HOLIDAY_COOKIE).toBe('lx_holiday');
    expect(readOverrideCookie('a=1; lx_holiday=christmas; b=2')).toBe('christmas');
    expect(readOverrideCookie('lx_holiday=off')).toBe('off');
    expect(readOverrideCookie('xlx_holiday=christmas')).toBeNull();
    expect(readOverrideCookie('lx_holiday=bogus')).toBeNull();
    expect(readOverrideCookie('')).toBeNull();
  });
});

describe('holidayCookie', () => {
  it('builds a site-wide cookie that lasts the season', () => {
    expect(holidayCookie('hanukkah')).toBe('lx_holiday=hanukkah; path=/; max-age=5184000; samesite=lax');
  });
});
