import { describe, it, expect, afterEach } from 'vitest';
import { isQrScanArrival } from '../utmCapture';

/**
 * isQrScanArrival reads the LIVE URL so a printed QR/barcode landing can be
 * routed straight to the daily challenge. It must fire only on the explicit
 * scan sources and only from the current URL (never stored UTM).
 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

describe('isQrScanArrival', () => {
  afterEach(() => setSearch(''));

  it('is true for utm_source=barcode', () => {
    setSearch('?utm_source=barcode');
    expect(isQrScanArrival()).toBe(true);
  });

  it('is true for qr / qrcode / qr-code sources (case-insensitive)', () => {
    setSearch('?utm_source=QR');
    expect(isQrScanArrival()).toBe(true);
    setSearch('?utm_source=qrcode');
    expect(isQrScanArrival()).toBe(true);
    setSearch('?utm_source=qr-code');
    expect(isQrScanArrival()).toBe(true);
  });

  it('is false for a non-scan source', () => {
    setSearch('?utm_source=facebook');
    expect(isQrScanArrival()).toBe(false);
  });

  it('is false when no utm_source is present', () => {
    setSearch('?ref=abc123');
    expect(isQrScanArrival()).toBe(false);
  });
});
