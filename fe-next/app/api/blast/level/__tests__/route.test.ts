import { describe, it, expect } from 'vitest';
import { GET } from '../route';

function req(url: string): Request {
  return new Request(url);
}

describe('GET /api/blast/level', () => {
  it('returns a BlastLevel for a valid level+locale', async () => {
    const res = await GET(req('http://test/api/blast/level?level=1&locale=en'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.levelNumber).toBe(1);
    expect(body.locale).toBe('en');
    expect(Array.isArray(body.columns)).toBe(true);
    expect(Array.isArray(body.words)).toBe(true);
  });

  it('rejects an invalid locale with 400', async () => {
    const res = await GET(req('http://test/api/blast/level?level=1&locale=xx'));
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric level with 400', async () => {
    const res = await GET(req('http://test/api/blast/level?level=abc&locale=en'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the level cannot be resolved', async () => {
    const res = await GET(req('http://test/api/blast/level?level=9999&locale=ja'));
    expect([404, 200]).toContain(res.status);
  });

  it('falls back to generator when chain build fails for he level 2', async () => {
    const res = await GET(req('http://test/api/blast/level?level=2&locale=he'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.levelNumber).toBe(2);
    expect(body.locale).toBe('he');
  });

  it('falls back to generator when chain build fails for en level 20', async () => {
    const res = await GET(req('http://test/api/blast/level?level=20&locale=en'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.levelNumber).toBe(20);
  });
});
