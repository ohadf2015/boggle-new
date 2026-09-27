/**
 * httpLogSerializers — pino-http request/response serializers.
 *
 * pino-http's DEFAULT req serializer emits the whole `headers` object on every
 * request, which in production meant ~3.7 KB per log line including the raw
 * `cookie` header (auth/session/PostHog ids). These serializers keep only what
 * is useful for tracing and drop everything else.
 */

import { describe, it, expect } from 'vitest';
import { httpLogSerializers } from '../logger';

const fakeReq = {
  id: 'req-1',
  method: 'POST',
  url: '/api/presence/heartbeat',
  query: { a: '1' },
  params: { b: '2' },
  headers: {
    cookie: 'session=secret; boggle_language=en',
    authorization: 'Bearer super-secret',
    host: 'www.lexiclash.live',
    'user-agent': 'Mozilla/5.0',
  },
  remoteAddress: '1.2.3.4',
};

describe('httpLogSerializers.req', () => {
  it('keeps only id, method and url', () => {
    expect(httpLogSerializers.req(fakeReq)).toEqual({
      id: 'req-1',
      method: 'POST',
      url: '/api/presence/heartbeat',
    });
  });

  it('never leaks cookies, authorization or any other header', () => {
    const serialized = JSON.stringify(httpLogSerializers.req(fakeReq));

    expect(serialized).not.toContain('cookie');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('Mozilla');
    expect(serialized).not.toContain('headers');
  });

  it('stays small enough to be cheap per request', () => {
    expect(JSON.stringify(httpLogSerializers.req(fakeReq)).length).toBeLessThan(150);
  });
});

describe('httpLogSerializers.res', () => {
  it('keeps only the status code', () => {
    expect(httpLogSerializers.res({ statusCode: 204 })).toEqual({ statusCode: 204 });
  });
});
