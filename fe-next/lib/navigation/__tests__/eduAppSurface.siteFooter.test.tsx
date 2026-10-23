import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

let pathname = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/components/AutoHideFooter', () => ({
  default: () => (
    <footer data-testid="site-footer">
      <a href="#contact">contact</a>
    </footer>
  ),
}));

import { SiteFooter } from '@/components/navigation/SiteFooter';
import { hidesSiteFooter } from '@/lib/navigation/eduAppSurface';

const EDU = [
  '/en/teacher',
  '/en/teacher/reports',
  '/he/teacher/classroom',
  '/en/student',
  '/he/student/lessons',
  '/en/join',
  '/he/join',
  '/en/join/ABC123',
  '/en/education',
  '/en/education/help',
  '/en/education/access',
  '/en/pricing',
  '/en/teacher/upgrade',
];
const CONSUMER = ['/en', '/he', '/en/singleplayer', '/en/multiplayer', '/en/blog', '/en/teacher-appreciation'];

describe('hidesSiteFooter', () => {
  it.each(EDU)('keeps the consumer site footer off %s', (path) => {
    expect(hidesSiteFooter(path)).toBe(true);
  });

  it.each(CONSUMER)('keeps it on %s', (path) => {
    expect(hidesSiteFooter(path)).toBe(false);
  });
});

describe('SiteFooter on edu surfaces', () => {
  it.each(EDU)('renders no footer links on %s', (path) => {
    pathname = path;
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll('a[href]')).toHaveLength(0);
  });

  it.each(CONSUMER)('still renders the footer on %s', (path) => {
    pathname = path;
    render(<SiteFooter />);
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });
});
