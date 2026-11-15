// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const render = async (q: string) => {
  const res = await GET(new NextRequest(`https://www.lexiclash.live/api/og/brag?${q}`));
  return { status: res.status, bytes: (await res.arrayBuffer()).byteLength };
};

describe('brag OG image', () => {
  it.each([
    'score=142&rival=118&name=Dana&mode=classic',
    'kind=record&score=900&mode=tower&me=Dana',
    'kind=worldRecord&score=1200&mode=quickPlay&me=Дана',
    'kind=achievement&title=Word%20Smith&me=Dana',
    'kind=level&score=12&me=%D7%93%D7%A0%D7%94',
  ])('renders a PNG for %s', async (q) => {
    const { status, bytes } = await render(q);
    expect(status).toBe(200);
    expect(bytes).toBeGreaterThan(5000);
  }, 30000);
});
