import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { resolveEducationNav } from '../navItems';
import { EducationNav } from '../EducationNav';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const SHELL = join(__dirname, '..');
const CSS = join(SHELL, 'eduNav.css');

describe('the feedback launcher never sits on the edu nav', () => {
  const nav = resolveEducationNav('/en/teacher')!;
  const t = (key: string) => key;

  it.each(['tabs', 'sidebar'] as const)('the %s variant carries the data-edu-nav marker', (variant) => {
    const { container } = render(<EducationNav nav={nav} t={t} variant={variant} />);
    expect(container.querySelector('nav[data-edu-nav]')).not.toBeNull();
  });

  it('hides the launcher only while an edu nav is on the page', () => {
    expect(existsSync(CSS)).toBe(true);
    const css = readFileSync(CSS, 'utf8').replace(/\s+/g, ' ');
    expect(css).toMatch(/body:has\(\[data-edu-nav\]\) #fdw-root ?\{ ?display: ?none;? ?\}/);
  });

  it('ships the rule with the nav that needs it', () => {
    const src = readFileSync(join(SHELL, 'EducationNav.tsx'), 'utf8');
    expect(src).toMatch(/^import '\.\/eduNav\.css';$/m);
  });
});
