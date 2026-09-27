import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProUsagePromptCard } from '../TeacherProUsagePromptCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { en } from '@/translations/en';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const mockTrack = vi.mocked(trackGrowthEvent);

describe('TeacherProUsagePromptCard', () => {
  beforeEach(() => vi.clearAllMocks());

  const renderCard = (props: { reason: 'students' | 'assignments'; count: number; onDismiss?: () => void }) =>
    render(
      <LanguageProvider initialLanguage="en" initialTranslations={en}>
        <TeacherProUsagePromptCard {...props} />
      </LanguageProvider>,
    );

  it('shows the students-limit copy, $9/mo, and links to the live checkout page', () => {
    renderCard({ reason: 'students', count: 14 });
    const card = screen.getByTestId('teacher-pro-usage-prompt');
    expect(card.textContent).toContain(en.teacher.subscription.usagePromptTitle);
    expect(card.textContent).toContain('14');
    expect(card.textContent).toContain('$' + String(TEACHER_PRO_PRICE_USD));
    const cta = screen.getByRole('link', { name: en.teacher.subscription.upgradeNow });
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('shows the assignments-limit copy for the assignments reason', () => {
    renderCard({ reason: 'assignments', count: 3 });
    const card = screen.getByTestId('teacher-pro-usage-prompt');
    expect(card.textContent).toContain(en.teacher.subscription.usagePromptAssignmentsBody.replace('{{count}}', '3'));
  });

  it('fires an iap_viewed impression tagged with the reason', () => {
    renderCard({ reason: 'students', count: 14 });
    expect(mockTrack).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'usage_prompt_students',
      event_type: 'impression',
    });
  });

  it('calls onDismiss from the dismiss button and keeps the checkout link', () => {
    const onDismiss = vi.fn();
    renderCard({ reason: 'assignments', count: 3, onDismiss });
    screen.getByTestId('teacher-pro-usage-prompt-dismiss').click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: en.teacher.subscription.upgradeNow })).toHaveAttribute(
      'href',
      '/en/teacher/upgrade',
    );
  });

  it('renders no dismiss control without an onDismiss handler', () => {
    renderCard({ reason: 'students', count: 14 });
    expect(screen.queryByTestId('teacher-pro-usage-prompt-dismiss')).toBeNull();
  });
});
