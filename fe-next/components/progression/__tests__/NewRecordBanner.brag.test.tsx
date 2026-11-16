import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { publishRunRecord, evaluateAgainstLedger, __resetRunRecordsForTests } from '@/lib/records/runRecord';
import { NewRecordBanner } from '../NewRecordBanner';

const share = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/quick-play' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile: { display_name: 'Noa' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

describe('NewRecordBanner brag', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetRunRecordsForTests();
    share.mockReset().mockResolvedValue('shared');
    Object.defineProperty(window, 'location', { value: { origin: 'https://lexiclash.live', pathname: '/en/quick-play' }, writable: true });
  });

  it('Given a new personal best, Then a Brag button shares a record link with score, mode and name', async () => {
    publishRunRecord({ mode: 'quickPlay', value: 80, previous: 64 });
    render(<NewRecordBanner mode="quickPlay" score={80} />);
    fireEvent.click(screen.getByTestId('brag-button-new_record'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const { text, url } = share.mock.calls[0][0];
    expect(text).toContain('brag2.text.record');
    expect(text).toContain('"score":"80"');
    const q = new URL(url).searchParams;
    expect(new URL(url).pathname).toBe('/en/brag/me');
    expect(q.get('kind')).toBe('record');
    expect(q.get('score')).toBe('80');
    expect(q.get('mode')).toBe('quickPlay');
    expect(q.get('me')).toBe('Noa');
  });

  it('Given an edu record, Then there is no Brag button', () => {
    evaluateAgainstLedger('edu', 50);
    render(<NewRecordBanner mode="edu" score={80} />);
    expect(screen.getByTestId('new-record-banner')).toBeTruthy();
    expect(screen.queryByTestId('brag-button-new_record')).toBeNull();
  });
});
