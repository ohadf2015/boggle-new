import React from 'react';
import { render } from '@testing-library/react';
import { DailyIntroCarousel } from '../DailyIntroCarousel';
import { DailyChallengeTutorial } from '../DailyChallengeTutorial';
import { LanguageProvider } from '@/contexts/LanguageContext';

function unknownPropErrors(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((c) => String(c[0]).includes('does not recognize'));
}

describe('daily swipe surfaces', () => {
  it('hand only touch handlers to the DOM, never the swipe hook internals', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LanguageProvider>
        <DailyIntroCarousel />
        <DailyChallengeTutorial onComplete={() => {}} onSkip={() => {}} />
      </LanguageProvider>,
    );
    expect(unknownPropErrors(spy)).toEqual([]);
    spy.mockRestore();
  });
});
