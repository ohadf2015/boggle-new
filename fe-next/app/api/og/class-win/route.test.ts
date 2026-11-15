import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const req = (query: string) => new NextRequest(`https://lexiclash.live/api/og/class-win${query}`);

describe('GET /api/og/class-win', () => {
  it('given class numbers and a known mode, when rendered, then it returns a PNG', async () => {
    const res = await GET(req('?words=42&students=18&found=9&total=10&mode=word-hunt'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });

  it('given hostile or missing params, when rendered, then it still returns a PNG instead of a broken unfurl', async () => {
    expect((await GET(req('?words=abc&mode=<script>&name=Noa'))).status).toBe(200);
    expect((await GET(req(''))).status).toBe(200);
  });
});
