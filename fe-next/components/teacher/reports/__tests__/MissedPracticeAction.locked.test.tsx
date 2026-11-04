import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const start = vi.fn();
vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ pending: false, start }) }));
vi.mock('@/hooks/useCheckoutBlockedInApp', () => ({ useCheckoutBlockedInApp: () => false }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackProUpgradeClicked: vi.fn() }));

import { MissedPracticeAction } from '../MissedPracticeAction';

describe('MissedPracticeAction for a free teacher', () => {
  it('shows the inline Pro lock with its hint instead of a link to the plans page', () => {
    render(<MissedPracticeAction classroomId="c1" classroomName="7B" locked words={['enormous']} />);
    const lock = screen.getByTestId('pro-inline-lock-missedPractice');
    expect(lock).toHaveTextContent('eduPro.practice.cta');
    expect(screen.getByText('eduPro.practice.hint')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('opens a sample, then starts checkout from the report', () => {
    window.history.pushState({}, '', '/en/teacher/reports?classroomId=c1');
    render(<MissedPracticeAction classroomId="c1" classroomName="7B" locked />);
    fireEvent.click(screen.getByTestId('pro-inline-lock-missedPractice'));
    expect(screen.getByTestId('pro-preview-missedPractice')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pro-inline-upgrade-missedPractice'));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
