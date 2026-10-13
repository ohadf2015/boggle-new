import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', dir: 'rtl' }),
}));

import { DailyFlowChrome } from '../DailyFlowChrome';

describe('DailyFlowChrome', () => {
  it('always links back to the daily hub', () => {
    render(<DailyFlowChrome modeId="word-tower" intro={false} />);
    expect(screen.getByTestId('back-to-daily').getAttribute('href')).toBe('/he/daily');
  });
  it('offers skip on optional challenges only', () => {
    const { unmount } = render(<DailyFlowChrome modeId="connections" intro={false} />);
    expect(screen.getByTestId('skip-optional').getAttribute('href')).toBe('/he/daily');
    unmount();
    render(<DailyFlowChrome modeId="word-hunt" intro={false} />);
    expect(screen.queryByTestId('skip-optional')).toBeNull();
  });
  it('plays the opening animation once per day', () => {
    sessionStorage.clear();
    const { unmount } = render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.getByTestId('daily-intro')).toBeTruthy();
    unmount();
    render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });
});
