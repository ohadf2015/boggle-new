import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProOfferCompactLink } from '@/components/education/results/ProOfferCompactLink';
import { resetProOfferSession } from '@/lib/education/pro/proOfferSession';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
let observers: Array<{ cb: Cb }> = [];
const originalIO = globalThis.IntersectionObserver;

beforeEach(() => {
  resetProOfferSession();
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  observers = [];
  class FakeIO {
    constructor(cb: Cb) {
      observers.push({ cb });
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  globalThis.IntersectionObserver = originalIO;
});

const posts = () =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([u]) => u === '/api/education/pro-offer-impression')
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe('ProOfferCompactLink impressions', () => {
  it('reports rendered on mount and viewed once half is on screen, with format=link', () => {
    render(
      <ProOfferCompactLink
        label="Keep Teacher Pro after my trial"
        placement="dashboard"
        language="en"
        cta="teacher_pro_trial"
        offer="keep_after_trial"
        userId="t1"
        href="/en/teacher/upgrade?source=dashboard"
      />,
    );
    expect(screen.getByTestId('teacher-pro-offer-compact')).toBeTruthy();
    expect(posts()).toEqual([
      { placement: 'dashboard', locale: 'en', cta: 'teacher_pro_trial', offer: 'keep_after_trial', format: 'link', stage: 'rendered' },
    ]);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(posts().map((p) => p.stage)).toEqual(['rendered', 'viewed']);
    expect(posts()[1]).toMatchObject({ format: 'link', placement: 'dashboard', stage: 'viewed' });
  });
});
