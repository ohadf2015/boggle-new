/**
 * ScheduleReteachLiveButton — one-click +14d reteach from miss-gap words.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleReteachLiveButton } from '../ScheduleReteachLiveButton';
import { SCHEDULED_RETEACH_STORAGE_KEY } from '@/lib/education/scheduleReteachLive';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const trackScheduled = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduReteachLiveScheduled: (args: unknown) => trackScheduled(args),
}));

describe('ScheduleReteachLiveButton', () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    openSpy.mockReturnValue(null);
    vi.stubGlobal('open', openSpy);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hides when there are no miss-gap words', () => {
    const { container } = render(
      <ScheduleReteachLiveButton
        classroomId="c1"
        classroomName="Year 7"
        missedWords={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('schedules reteach Live, opens calendar, and persists the seed', async () => {
    const user = userEvent.setup();
    render(
      <ScheduleReteachLiveButton
        classroomId="c1"
        classroomName="Year 7"
        missedWords={['ephemeral', 'quirk']}
      />,
    );
    await user.click(screen.getByTestId('schedule-reteach-live-button'));

    expect(trackScheduled).toHaveBeenCalledWith({ wordCount: 2, delayDays: 14 });
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('calendar.google.com');

    const stored = window.localStorage.getItem(SCHEDULED_RETEACH_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored!).toContain('ephemeral');
    expect(screen.getByTestId('schedule-reteach-live-confirm')).toBeInTheDocument();
  });
});
