import React from 'react';
import { render } from '@testing-library/react';
import { DailyArrivalCard } from '../DailyArrivalCard';
import { saveFlySource } from '../dailyFly';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('DailyArrivalCard fly', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('flies the art in from where the CTA art was tapped', () => {
    const animate = vi.fn();
    HTMLElement.prototype.animate = animate as never;
    saveFlySource({ left: 20, top: 700, width: 56, height: 56 } as DOMRect);
    render(<DailyArrivalCard modeId="connections" />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect((animate.mock.calls[0][0] as Keyframe[]).length).toBe(2);
  });

  it('plays nothing when there was no tap (direct visit)', () => {
    const animate = vi.fn();
    HTMLElement.prototype.animate = animate as never;
    render(<DailyArrivalCard modeId="connections" />);
    expect(animate).not.toHaveBeenCalled();
  });
});
