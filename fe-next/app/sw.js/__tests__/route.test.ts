import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { SW_SOURCE } from '@/lib/sw/swSource';

describe('/sw.js route', () => {
  it('serves the real app service worker with SW headers', async () => {
    const res = GET();
    const body = await res.text();
    expect(body).toBe(SW_SOURCE);
    expect(res.headers.get('Content-Type')).toContain('javascript');
    expect(res.headers.get('Service-Worker-Allowed')).toBe('/');
  });
});
