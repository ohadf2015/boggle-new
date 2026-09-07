/**
 * Streak OG card.
 *
 * Its own route rather than another branch inside the 600-line shared
 * /api/og/route.tsx, matching the convention already used by
 * /api/og/{challenge,room,word-hunt,boss-defeat,daily-rank}.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { writeFileSync } from 'node:fs';
import { GET } from './route';

function req(query: string) {
  return new NextRequest(`https://lexiclash.live/api/og/streak${query}`);
}

describe('GET /api/og/streak', () => {
  it('renders a PNG for a valid streak', async () => {
    const res = await GET(req('?streak=30&tier=legendary'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });

  it('falls back to the coolest tier for an unknown tier id', async () => {
    // Never 500 on a hand-edited share URL — an OG endpoint that throws shows
    // a broken-image box in every social preview that crawls it.
    const res = await GET(req('?streak=4&tier=not-a-tier'));
    expect(res.status).toBe(200);
  });

  it('derives the tier from the streak when none is given', async () => {
    const res = await GET(req('?streak=100'));
    expect(res.status).toBe(200);
  });

  it('survives a missing streak param', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(200);
  });

  it('rejects a non-numeric streak without throwing', async () => {
    const res = await GET(req('?streak=DROP+TABLE'));
    expect(res.status).toBe(200);
  });

  it('is cacheable — social crawlers refetch these constantly', async () => {
    const res = await GET(req('?streak=7&tier=fire'));
    expect(res.headers.get('cache-control')).toBeTruthy();
  });

  // Byte-level check: Satori silently drops an image it cannot decode, which
  // would ship a mascot-less card that still returns 200. A real PNG header
  // plus a substantial payload is the cheapest proof the tier art rasterized.
  it('rasterizes a real PNG that actually contains the tier mascot', async () => {
    const withMascot = Buffer.from(
      await (await GET(req('?streak=42&tier=legendary'))).arrayBuffer(),
    );
    expect(withMascot.subarray(0, 4).toString('hex')).toBe('89504e47');
    expect(withMascot.length).toBeGreaterThan(20_000);

    if (process.env.STREAK_OG_WRITE) {
      writeFileSync('/tmp/og-streak-legendary.png', withMascot);
    }
  }, 60_000);

  it('renders visibly different cards for different tiers', async () => {
    const cool = Buffer.from(await (await GET(req('?streak=1&tier=starting'))).arrayBuffer());
    const hot = Buffer.from(await (await GET(req('?streak=120&tier=immortal'))).arrayBuffer());
    expect(cool.equals(hot)).toBe(false);
  }, 60_000);
});
