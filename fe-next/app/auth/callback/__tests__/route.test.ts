// @vitest-environment node
import { NextRequest } from 'next/server';
import { GET } from '../route';

async function hit(query: string, cookie?: string): Promise<string> {
  const headers = cookie ? { cookie } : undefined;
  const res: Response = await GET(new NextRequest(`https://www.lexiclash.live/auth/callback?locale=en&${query}`, { headers }));
  const loc = new URL(res.headers.get('location')!);
  return loc.pathname + loc.search;
}

describe('server auth callback', () => {
  it('a provider error from an edu sign-in returns to the edu entry', async () => {
    expect(await hit('error=access_denied&next=%2Fen%2Fteacher')).toBe('/en/teacher?auth_error=true&reason=access_denied');
  });

  it('a provider error from the arcade still goes home', async () => {
    expect(await hit('error=access_denied&next=%2Fen%2Fdaily')).toBe('/en?auth_error=true&reason=access_denied');
  });

  it('a code-less hit from edu returns to the edu entry, keeping its query', async () => {
    expect(await hit('next=%2Fru%2Feducation%2Faccess%3Ffrom%3Dteacher')).toBe('/ru/education/access?from=teacher');
  });

  it('a code-less hit with no next goes home', async () => {
    expect(await hit('')).toBe('/en');
  });

  it('a code-less hit with no next returns to the remembered edu origin', async () => {
    expect(await hit('', `lexi_edu_auth_origin=${encodeURIComponent('/he/student/join?code=AB')}`)).toBe('/he/student/join?code=AB');
  });

  it('a provider error with no next returns to the remembered edu origin', async () => {
    expect(await hit('error=access_denied', `lexi_edu_auth_origin=${encodeURIComponent('/en/teacher')}`)).toBe(
      '/en/teacher?auth_error=true&reason=access_denied',
    );
  });

  it('a non-edu or off-site marker is ignored', async () => {
    expect(await hit('', `lexi_edu_auth_origin=${encodeURIComponent('//evil.example.com/teacher')}`)).toBe('/en');
    expect(await hit('', `lexi_edu_auth_origin=${encodeURIComponent('/en/daily')}`)).toBe('/en');
  });

  it('forwards a code with its next to the localized client callback', async () => {
    expect(await hit('code=abc&next=%2Fen%2Fstudent%2Fjoin')).toBe('/en/auth/callback?code=abc&next=%2Fen%2Fstudent%2Fjoin');
  });

  it('an arcade email callback with a stale edu marker still lands on the homepage', async () => {
    const stale = `lexi_edu_auth_origin=${encodeURIComponent('/en/teacher')}`;
    expect(await hit('next=%2Fen', stale)).toBe('/en');
    expect(await hit('code=abc&next=%2Fen', stale)).toBe('/en/auth/callback?code=abc&next=%2Fen');
  });

  it.each(['', 'code=abc', 'error=access_denied'])('every redirect (%s) clears the edu marker', async (query) => {
    const res: Response = await GET(
      new NextRequest(`https://www.lexiclash.live/auth/callback?locale=en&${query}`, {
        headers: { cookie: `lexi_edu_auth_origin=${encodeURIComponent('/en/teacher')}` },
      }),
    );
    expect(res.headers.get('set-cookie')).toMatch(/lexi_edu_auth_origin=;.*Max-Age=0/i);
  });
});
