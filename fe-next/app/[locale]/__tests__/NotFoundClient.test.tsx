/**
 * The 404 page's primary CTA hardcoded `href={\`/${language}\`}` — a missing
 * path under /teacher, /student, /education (flow sub-route) or /join used to
 * bounce the user to the main app homepage instead of back into their own
 * section (education homepage-bounce audit). Fixed to route through
 * `sectionHome`, using the actual missing pathname.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockPathname = '/en/teacher/classroom/999/lesson/123';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => fallback ?? k, language: 'en' }),
}));
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="mascot" />,
}));
vi.mock('@/lib/deploy/staleDeployReload', () => ({
  recoverFromStaleChunk: vi.fn(async () => {}),
  clearCachesAndReload: vi.fn(),
  CHUNK_RECOVERY_GUARD_KEY: 'chunk-recovery-guard',
}));

import NotFoundClient from '../NotFoundClient';

beforeEach(() => {
  mockPathname = '/en/teacher/classroom/999/lesson/123';
});

describe('NotFoundClient — primary CTA is education-aware (sectionHome)', () => {
  it('routes a missing /teacher/* path back to /{locale}/education, not bare /{locale}', () => {
    mockPathname = '/en/teacher/classroom/999/lesson/123';
    render(<NotFoundClient />);
    const cta = screen.getByRole('link', { name: /notFound.button/i }) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/en/education');
  });

  it('routes a missing /student/* path back to /{locale}/education', () => {
    mockPathname = '/en/student/lessons/gone';
    render(<NotFoundClient />);
    const cta = screen.getByRole('link', { name: /notFound.button/i }) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/en/education');
  });

  it('routes a missing functional /education/* flow sub-route back to /{locale}/education', () => {
    mockPathname = '/en/education/duels/does-not-exist';
    render(<NotFoundClient />);
    const cta = screen.getByRole('link', { name: /notFound.button/i }) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/en/education');
  });

  it('routes a missing /join/* path back to /{locale}/education', () => {
    mockPathname = '/en/join/DOESNOTEXIST';
    render(<NotFoundClient />);
    const cta = screen.getByRole('link', { name: /notFound.button/i }) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/en/education');
  });

  it('routes a genuinely non-education missing path to bare /{locale}', () => {
    mockPathname = '/en/some-random-missing-page';
    render(<NotFoundClient />);
    const cta = screen.getByRole('link', { name: /notFound.button/i }) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/en');
  });
});
