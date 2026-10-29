import { describe, it, expect, vi, afterEach } from 'vitest';
import { reportProOfferClick } from '../reportProCtaClick';

const args = { placement: 'dashboard', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial' as const };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reportProOfferClick', () => {
  it('sends a beacon to the cookie-free click route so navigation never waits on it', () => {
    const beacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    reportProOfferClick(args);
    expect(beacon).toHaveBeenCalledWith('/api/education/pro-offer-click', expect.any(Blob));
    expect(f).not.toHaveBeenCalled();
  });

  it('falls back to a keepalive fetch when the beacon is refused or missing', () => {
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) });
    const f = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', f);
    reportProOfferClick(args);
    expect(f).toHaveBeenCalledWith('/api/education/pro-offer-click', expect.objectContaining({ method: 'POST', keepalive: true, body: JSON.stringify(args) }));
  });

  it('never throws', () => {
    vi.stubGlobal('navigator', { sendBeacon: () => { throw new Error('x'); } });
    vi.stubGlobal('fetch', () => { throw new Error('y'); });
    expect(() => reportProOfferClick(args)).not.toThrow();
  });
});
