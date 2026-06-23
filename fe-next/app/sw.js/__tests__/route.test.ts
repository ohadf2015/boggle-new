import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { SW_SOURCE } from '@/lib/sw/swSource';

// NB: undici's Request constructor strips forbidden headers (Sec-*, Cookie) from
// JS-built requests, so we mock the request with a controllable headers.get().
// Server-RECEIVED requests (real Monetag GET, real browser) DO carry them.
function reqWith(headers: Record<string, string>): Request {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    headers: { get: (k: string) => lower[k.toLowerCase()] ?? null },
  } as unknown as Request;
}

describe('/sw.js route — Monetag verifier isolation', () => {
  it('serves the real app SW to a genuine SW registration (Sec-Fetch-Dest: serviceworker)', async () => {
    const res = GET(reqWith({ 'sec-fetch-dest': 'serviceworker', cookie: 'boggle_language=en' }));
    const body = await res.text();
    expect(body).toBe(SW_SOURCE);
    expect(body).not.toContain('3nbf4.com');
  });

  it('serves the real app SW to any request that carries a cookie (returning user)', async () => {
    const res = GET(reqWith({ cookie: 'boggle_language=he' }));
    expect(await res.text()).toBe(SW_SOURCE);
  });

  it('serves Monetag verification content ONLY to the bare verifier (no Sec-Fetch-Dest, no cookie)', async () => {
    const res = GET(reqWith({ 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) Chrome/60' }));
    const body = await res.text();
    expect(body).toContain('"zoneId": 11192958');
    expect(body).toContain("importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')");
    expect(body).not.toContain('LexiClash Service Worker'); // NOT the app SW
    expect(res.headers.get('Content-Type')).toContain('javascript');
  });

  it('never lets the Monetag SW reach a real browser (the verifier path requires BOTH signals absent)', async () => {
    // sec-fetch-dest present but no cookie (e.g. a fresh SW registration) → still app SW
    const res = GET(reqWith({ 'sec-fetch-dest': 'serviceworker' }));
    expect(await res.text()).toBe(SW_SOURCE);
  });
});
