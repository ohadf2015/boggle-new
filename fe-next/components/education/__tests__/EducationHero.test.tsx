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

  it('keeps the headline off the 6xl scale and stacks the quiet student link under the one primary', () => {
    render(<EducationHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).not.toMatch(/text-6xl/);
    const ctaRow = screen.getByTestId('education-hero-free-cta').parentElement?.className.split(/\s+/) ?? [];
    expect(ctaRow).toContain('flex-col');
    expect(ctaRow).not.toContain('lg:flex-row');
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

  it('Given a long locale, When the CTAs are wider than their column, Then they wrap instead of widening the hero grid', () => {
    render(<EducationHero />);
    const grid = screen.getByRole('heading', { level: 1 }).parentElement?.parentElement;
    expect(grid?.className.split(/\s+/)).toContain('grid-cols-[minmax(0,1fr)]');
    for (const id of ['education-hero-free-cta', 'education-hero-join-cta']) {
      const classes = screen.getByTestId(id).className.split(/\s+/);
      expect(classes).not.toContain('whitespace-nowrap');
      expect(classes).not.toContain('sm:whitespace-nowrap');
    }
  });

  it('Given a desktop viewport, When the hero lays out, Then the copy has a fixed max width and the board owns its own column', () => {
    render(<EducationHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const grid = h1.parentElement?.parentElement?.className.split(/\s+/) ?? [];
    expect(grid).toContain('lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]');
    expect(grid).toContain('xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]');
    expect(h1.parentElement?.className.split(/\s+/)).toContain('lg:max-w-[34rem]');
  });

  it('keeps one boxed action at every width: the student join is a borderless link, never a second button', () => {
    render(<EducationHero />);
    const classes = screen.getByTestId('education-hero-join-cta').className.split(/\s+/);
    for (const boxed of ['border-3', 'sm:border-3', 'min-h-14', 'sm:min-h-14', 'shadow-hard']) {
      expect(classes).not.toContain(boxed);
    }
    expect(classes).toContain('min-h-11');
  });

  it('shows the tilted backing card behind the board on phones too', () => {
    render(<EducationHero />);
    const backing = demoColumn()?.querySelector('span[aria-hidden="true"]');
    expect(backing).not.toBeNull();
    expect(backing!.className.split(/\s+/)).not.toContain('hidden');
  });

  it('puts the proof points in a full-width strip under both columns, not under the copy only', () => {
    render(<EducationHero />);
    const proof = screen.getByRole('list', { name: 'eg2Land.proof.label' });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.parentElement?.contains(proof)).toBe(false);
    expect(demoColumn()?.contains(proof)).toBe(false);
    expect(proof.className).toMatch(/sm:grid-cols-3/);
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
