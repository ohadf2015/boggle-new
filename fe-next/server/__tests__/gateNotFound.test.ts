import { describe, it, expect } from 'vitest';
import { sendGateNotFound, GATE_NOT_FOUND_HTML } from '../gateNotFound';

function fakeRes() {
  const r: any = { headers: {} as Record<string, string>, statusCode: 0, body: undefined as unknown };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b?: unknown) => { r.body = b; };
  return r;
}

describe('sendGateNotFound', () => {
  it('serves a 404 HTML page with a content type so browsers render it, not download it', () => {
    const res = fakeRes();
    sendGateNotFound(res, 'GET');
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toBe(GATE_NOT_FOUND_HTML);
    expect(GATE_NOT_FOUND_HTML).toContain('href="/"');
    expect(GATE_NOT_FOUND_HTML).toContain('noindex');
  });
  it('sends no body for HEAD', () => {
    const res = fakeRes();
    sendGateNotFound(res, 'HEAD');
    expect(res.statusCode).toBe(404);
    expect(res.body).toBeUndefined();
  });
});
