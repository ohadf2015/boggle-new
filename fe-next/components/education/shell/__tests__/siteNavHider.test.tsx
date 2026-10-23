import { readFileSync } from 'fs';
import { join } from 'path';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

let pathname = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/components/GlobalBottomNav', () => ({ default: () => <nav data-testid="player-bottom-nav" /> }));

import { PlayerBottomNav } from '@/components/navigation/PlayerBottomNav';
import { EDU_SURFACE_BODY_CLASS } from '../EduSiteNavHider';

afterEach(() => {
  cleanup();
  document.body.className = '';
});

const SHELL = join(__dirname, '..');
const EDU = ['/en/teacher', '/he/teacher/reports', '/en/join', '/he/join/ABC123', '/en/student', '/en/education/access', '/he/education/help'];
const CONSUMER = ['/en', '/he', '/en/singleplayer', '/en/blog'];

describe('the layout site navigation on edu surfaces', () => {
  it.each(EDU)('marks the body as an edu surface on %s', (path) => {
    pathname = path;
    render(<PlayerBottomNav />);
    expect(document.body.classList.contains(EDU_SURFACE_BODY_CLASS)).toBe(true);
  });

  it.each(CONSUMER)('leaves the body unmarked on %s', (path) => {
    pathname = path;
    render(<PlayerBottomNav />);
    expect(document.body.classList.contains(EDU_SURFACE_BODY_CLASS)).toBe(false);
  });

  it('drops the mark when the viewer leaves edu for a consumer page', () => {
    pathname = '/en/teacher';
    const { rerender } = render(<PlayerBottomNav />);
    pathname = '/en/blog';
    rerender(<PlayerBottomNav />);
    expect(document.body.classList.contains(EDU_SURFACE_BODY_CLASS)).toBe(false);
  });

  it('hides the sr-only Site Navigation only under the mark', () => {
    const css = readFileSync(join(SHELL, 'eduSiteNav.css'), 'utf8').replace(/\s+/g, ' ');
    expect(css).toMatch(
      new RegExp(`body\\.${EDU_SURFACE_BODY_CLASS} nav\\[aria-label="Site Navigation"\\] ?\\{ ?display: ?none;? ?\\}`),
    );
  });

  it('ships the rule with the component that writes the mark', () => {
    const src = readFileSync(join(SHELL, 'EduSiteNavHider.tsx'), 'utf8');
    expect(src).toMatch(/^import '\.\/eduSiteNav\.css';$/m);
  });
});
