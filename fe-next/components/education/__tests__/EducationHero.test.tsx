import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EducationHero } from '../EducationHero';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k), language: 'en' }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="education-landing-demo-slot" />,
}));

const mockTrackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...args: unknown[]) => mockTrackLandingCtaClick(...args),
}));

const demoColumn = () => screen.getByTestId('education-landing-demo-slot').closest('[data-hero-item]');

describe('EducationHero', () => {
  beforeEach(() => mockTrackLandingCtaClick.mockClear());

  it('keeps the headline off the 6xl scale and the two actions in one row on large screens', () => {
    render(<EducationHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).not.toMatch(/text-6xl/);
    const free = screen.getByTestId('education-hero-free-cta');
    expect(free.parentElement?.className).toMatch(/lg:flex-row/);
    const grid = h1.parentElement?.parentElement;
    expect(grid?.className).toMatch(/items-start/);
    expect(grid?.className).not.toMatch(/items-center/);
  });

  it('renders one primary free start, a student join as the secondary, and Pro only as a quiet price link', () => {
    render(<EducationHero />);
    const free = screen.getByTestId('education-hero-free-cta');
    expect(free).toHaveAttribute('href', '/en/education/access');
    expect(free).toHaveTextContent('eg2Land.hero.ctaPrimary');
    expect(screen.getByTestId('education-hero-join-cta')).toHaveAttribute('href', '/en/join');
    const pro = screen.getByTestId('education-hero-pro-cta');
    expect(pro).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(pro.textContent).toMatch(/\$9/);
  });

  it('tracks Pro and free hero CTA clicks separately', () => {
    render(<EducationHero />);
    fireEvent.click(screen.getByTestId('education-hero-pro-cta'));
    expect(mockTrackLandingCtaClick).toHaveBeenCalledWith('education_hero_pro');
    fireEvent.click(screen.getByTestId('education-hero-free-cta'));
    expect(mockTrackLandingCtaClick).toHaveBeenCalledWith('education_hero');
  });

  it('renders the playable board slot in place of the CSS mock', () => {
    render(<EducationHero />);
    expect(screen.queryByTestId('mock-join-code')).toBeNull();
    expect(demoColumn()).not.toBeNull();
  });

  it('ensures h1 and primary CTA precede the playable board in source order (mobile-first)', () => {
    render(<EducationHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const primaryCTA = screen.getByTestId('education-hero-free-cta');
    const board = demoColumn()!;
    expect(h1.compareDocumentPosition(primaryCTA) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(h1.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primaryCTA.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not apply unprefixed order-* classes to the board column (prevents mobile reflow)', () => {
    render(<EducationHero />);
    const className = demoColumn()?.className ?? '';
    expect(className).not.toMatch(/\border-first\b/);
    expect(className).not.toMatch(/\border-last\b/);
    expect(className).not.toMatch(/\border-\d+\b/);
  });

  it('renders free CTA as the one lime action; the join and Pro links carry no fill', () => {
    render(<EducationHero />);
    const free = screen.getByTestId('education-hero-free-cta');
    const join = screen.getByTestId('education-hero-join-cta');
    const pro = screen.getByTestId('education-hero-pro-cta');
    expect(free.className).toMatch(/bg-neo-lime/);
    expect(free.className).toMatch(/text-lg/);
    expect(free.className).not.toMatch(/animate-pulse/);
    for (const quiet of [join, pro]) {
      expect(quiet.className).not.toMatch(/\bbg-neo-/);
      expect(quiet.className).not.toMatch(/animate-pulse/);
    }
  });

  it('never sends the free CTA through the /teacher gate, so no ?from= bounce notice', () => {
    render(<EducationHero />);
    const href = screen.getByTestId('education-hero-free-cta').getAttribute('href') ?? '';
    expect(href).not.toMatch(/\/teacher(\?|$)/);
    expect(href).not.toMatch(/from=/);
  });

  it('asks a signed-in account without teacher access to finish setup instead of signing up again', () => {
    render(<EducationHero setupPending />);
    const free = screen.getByTestId('education-hero-free-cta');
    expect(free).toHaveAttribute('href', '/en/education/access');
    expect(free).toHaveTextContent('eg2Land.hero.ctaFinishSetup');
  });
});
