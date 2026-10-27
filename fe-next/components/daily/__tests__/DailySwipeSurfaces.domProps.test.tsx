import React from 'react';
import { render } from '@testing-library/react';
import { DailyChallengeTutorial } from '../DailyChallengeTutorial';
import { LanguageProvider } from '@/contexts/LanguageContext';

function unknownPropErrors(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((c) => String(c[0]).includes('does not recognize'));
}

describe('daily tutorial surface', () => {
  it('pass no unknown props to the DOM', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LanguageProvider>
        <DailyChallengeTutorial onComplete={() => {}} onSkip={() => {}} />
      </LanguageProvider>,
    );
    expect(unknownPropErrors(spy)).toEqual([]);
    spy.mockRestore();
  });
});
