import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import HolidayClassKeeper from '../HolidayClassKeeper';

describe('HolidayClassKeeper', () => {
  it('calms the ambience on game routes reached by client navigation and lifts it on the way back', () => {
    const { rerender } = render(<HolidayClassKeeper />);
    expect(document.body.hasAttribute('data-holiday-calm')).toBe(false);
    pathname = '/en/multiplayer';
    rerender(<HolidayClassKeeper />);
    expect(document.body.hasAttribute('data-holiday-calm')).toBe(true);
    pathname = '/he';
    rerender(<HolidayClassKeeper />);
    expect(document.body.hasAttribute('data-holiday-calm')).toBe(false);
  });
});
