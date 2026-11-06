import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArcadeBackdrop } from '../ArcadeBackdrop';
import { EducationShell } from '../EducationShell';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', isRTL: false }),
}));
vi.mock('../TeacherAccountMenu', () => ({ TeacherAccountMenu: () => null }));

afterEach(() => {
  cleanup();
  document.body.className = '';
  pathname.current = '/';
});

describe('ArcadeBackdrop', () => {
  it('Given the backdrop, Then it is hidden from assistive tech and never takes a click', () => {
    const { getByTestId } = render(<ArcadeBackdrop />);
    const bg = getByTestId('arcade-backdrop');
    expect(bg.getAttribute('aria-hidden')).toBe('true');
    expect(bg.className).toContain('pointer-events-none');
  });

  it('Then it draws five to seven outlined shapes, faint enough that text on top stays legible', () => {
    const { getAllByTestId } = render(<ArcadeBackdrop />);
    const shapes = getAllByTestId('arcade-shape');
    expect(shapes.length).toBeGreaterThanOrEqual(5);
    expect(shapes.length).toBeLessThanOrEqual(7);
    for (const s of shapes) {
      const opacity = Number(s.getAttribute('class')?.match(/opacity-\[(0\.\d+)\]/)?.[1]);
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(0.15);
      expect(s.querySelector('[fill]:not([fill="none"])')).toBeNull();
    }
  });

  it('Then the shapes only drift through the drift utility, which the stylesheet turns off for reduced motion', () => {
    const { getAllByTestId } = render(<ArcadeBackdrop />);
    for (const s of getAllByTestId('arcade-shape')) expect(s.getAttribute('class')).toContain('animate-edu-drift');
    const css = readFileSync(join(__dirname, '../../../../app/animations.css'), 'utf8');
    const safe = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)', css.indexOf('@keyframes edu-drift')));
    for (const cls of ['animate-edu-drift', 'animate-edu-bob', 'animate-edu-hop', 'animate-edu-tile-in', 'animate-edu-shine']) {
      expect(safe).toContain(`.${cls}`);
    }
    expect(css.slice(0, css.indexOf('@keyframes edu-drift'))).not.toContain('.animate-edu-');
  });

  it('Given a teacher screen, Then the shell mounts it behind the content column', () => {
    pathname.current = '/he/teacher';
    const { getByTestId } = render(<EducationShell>body</EducationShell>);
    const bg = getByTestId('arcade-backdrop');
    expect(bg.parentElement?.className).toContain('isolate');
    expect(bg.className).toContain('-z-10');
  });

  it('Given a student screen or a chrome-free drill, Then no backdrop', () => {
    pathname.current = '/en/student';
    const student = render(<EducationShell>body</EducationShell>);
    expect(student.queryByTestId('arcade-backdrop')).toBeNull();
    cleanup();
    pathname.current = '/en/teacher';
    const drill = render(<EducationShell chromeFree>body</EducationShell>);
    expect(drill.queryByTestId('arcade-backdrop')).toBeNull();
  });
});
