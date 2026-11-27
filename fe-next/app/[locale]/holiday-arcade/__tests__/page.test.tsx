import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/holidays/arcade/ArcadeHub', () => ({ default: () => <div data-testid="hub" /> }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => <header data-testid="site-header" /> }));

import HolidayArcadePage from '../page';

describe('holiday arcade page', () => {
  it('Given a tall phone, then the page is a flex column that grows with the body instead of a fixed screen-height box', () => {
    render(<HolidayArcadePage />);
    const main = screen.getByTestId('hub').closest('main')!;
    expect(main.className).toMatch(/\bflex\b/);
    expect(main.className).toContain('flex-col');
    expect(main.className).toContain('flex-[1_0_auto]');
    expect(main.className).not.toMatch(/\bmin-h-(full|screen)\b/);
  });

  it('Given the arcade hub, then the standard site header sits above it like on other mode pages', () => {
    render(<HolidayArcadePage />);
    const header = screen.getByTestId('site-header');
    expect(header.compareDocumentPosition(screen.getByTestId('hub')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
