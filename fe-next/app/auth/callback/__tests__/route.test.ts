// @vitest-environment node
import { NextRequest } from 'next/server';
import { GET } from '../route';

async function hit(query: string): Promise<string> {
  const res: Response = await GET(new NextRequest(`https://www.lexiclash.live/auth/callback?locale=en&${query}`));
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
    expect(await hit('next=%2Fru%2Feducation%2Faccess%3Ffrom%3Dteacher')).toBe('/en/education/access?from=teacher');
  });

  it('a code-less hit with no next goes home', async () => {
    expect(await hit('')).toBe('/en');
  });

  it('forwards a code with its next to the localized client callback', async () => {
    expect(await hit('code=abc&next=%2Fen%2Fstudent%2Fjoin')).toBe('/en/auth/callback?code=abc&next=%2Fen%2Fstudent%2Fjoin');
  });
});
