import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

let pathname = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/components/AutoHideFooter', () => ({ default: () => <footer data-testid="site-footer" /> }));

import { SiteFooter } from '../SiteFooter';

describe('SiteFooter', () => {
  it.each(['/en/teacher/upgrade', '/en/pricing', '/he/pricing', '/en/education', '/en/student', '/en/teacher/reports', '/en/join'])('leaves the consumer site footer off the edu page %s', (path) => {
    pathname = path;
    render(<SiteFooter />);
    expect(screen.queryByTestId('site-footer')).toBeNull();
  });

  it.each(['/en', '/en/singleplayer', '/en/blog'])('keeps it on %s', (path) => {
    pathname = path;
    render(<SiteFooter />);
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });
});
