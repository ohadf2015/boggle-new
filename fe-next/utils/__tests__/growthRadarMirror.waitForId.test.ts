// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitForGrDistinctId } from '../growthRadarMirror';

const VALID_ID = 'mi7x2k3a-8f3k2l9q0zp1';

function mountTrackerScript(): void {
  const script = document.createElement('script');
  // text/plain so happy-dom does not try to fetch the real tracker.
  script.type = 'text/plain';
  script.src = 'https://growthradar.app/gr.js';
  document.head.appendChild(script);
}

beforeEach(() => {
  window.localStorage.clear();
  document.head.innerHTML = '';
  delete window.gr;
});

afterEach(() => {
  window.localStorage.clear();
  document.head.innerHTML = '';
  delete window.gr;
});

describe('waitForGrDistinctId', () => {
  it('returns a persisted id immediately', async () => {
    window.localStorage.setItem('gr_did', VALID_ID);
    const started = Date.now();
    await expect(waitForGrDistinctId()).resolves.toBe(VALID_ID);
    expect(Date.now() - started).toBeLessThan(200);
  });

  it('does not wait when the tracker is not on the page', async () => {
    const started = Date.now();
    await expect(waitForGrDistinctId(2000)).resolves.toBeNull();
    expect(Date.now() - started).toBeLessThan(200);
  });

  it('waits for lazyOnload gr.js to write the id', async () => {
    mountTrackerScript();
    const pending = waitForGrDistinctId(1000);
    setTimeout(() => window.localStorage.setItem('gr_did', VALID_ID), 80);
    await expect(pending).resolves.toBe(VALID_ID);
  });

  it('returns null if the tracker loads but never writes a consented id', async () => {
    mountTrackerScript();
    await expect(waitForGrDistinctId(120)).resolves.toBeNull();
  });

  it('ignores a user id written to localStorage', async () => {
    window.localStorage.setItem('gr_did', '44a8bb33-1c2d-4e5f-8a9b-0c1d2e3f4a5b');
    mountTrackerScript();
    await expect(waitForGrDistinctId(120)).resolves.toBeNull();
  });
});
