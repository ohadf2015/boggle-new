import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));
const download = vi.fn();
vi.mock('@/lib/education/downloadIcs', () => ({ downloadIcs: (...a: unknown[]) => download(...a) }));

import { LessonPlanBooked } from '../LessonPlanBooked';

const K = 'eduLiveRoom.hostResults.lessonPlan';
const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const AT = new Date('2026-11-20T07:00:00.000Z');
const classroom = { id: 'class-1', name: 'Room 4B', joinCode: 'ABC123' };
const writeText = vi.fn();
const open = vi.fn();

function renderBooked(source: 'practice_results' | 'teacher_home' = 'practice_results') {
  return render(
    <LessonPlanBooked
      lessonAt={AT}
      when="Friday 9:00 AM"
      classroom={classroom}
      origin="https://lexiclash.live"
      language="en"
      source={source}
      onChange={vi.fn()}
      t={t}
    />,
  );
}

beforeEach(() => {
  track.mockReset();
  download.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  open.mockReset();
  vi.stubGlobal('open', open);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<LessonPlanBooked>', () => {
  it('Given a booked class, When shown, Then names the time and shows the class join link', () => {
    renderBooked();
    expect(screen.getByTestId('lesson-plan-saved')).toHaveTextContent(`${K}.booked`);
    expect(screen.getByTestId('lesson-plan-saved')).toHaveTextContent('Friday 9:00 AM');
    expect(screen.getByTestId('lesson-plan-link')).toHaveTextContent('lexiclash.live/en/join/ABC123');
  });

  it('Given a booked class, When Google Calendar is tapped, Then opens an event with the join link and tracks the invite', () => {
    renderBooked();
    fireEvent.click(screen.getByTestId('lesson-plan-google'));
    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('text')).toContain('Room 4B');
    expect(url.searchParams.get('details')).toContain('https://lexiclash.live/en/join/ABC123');
    expect(track).toHaveBeenCalledWith('lesson_plan_invite_added', { target: 'google', source: 'practice_results' });
  });

  it('Given a booked class, When the .ics button is tapped, Then downloads an event at the booked time and tracks it', () => {
    renderBooked('teacher_home');
    fireEvent.click(screen.getByTestId('lesson-plan-ics'));
    expect(download).toHaveBeenCalledTimes(1);
    const [ics, filename] = download.mock.calls[0] as [string, string];
    expect(ics).toContain('DTSTART:20261120T070000Z');
    expect(ics).toContain('ABC123');
    expect(filename).toMatch(/\.ics$/);
    expect(track).toHaveBeenCalledWith('lesson_plan_invite_added', { target: 'ics', source: 'teacher_home' });
  });

  it('Given a booked class, When Copy link is tapped, Then copies the join link, says so and tracks it', async () => {
    renderBooked();
    fireEvent.click(screen.getByTestId('lesson-plan-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://lexiclash.live/en/join/ABC123'));
    expect(await screen.findByText(`${K}.copied`)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('lesson_plan_link_copied', { source: 'practice_results' });
  });

  it('Given the clipboard refuses, When Copy link is tapped, Then nothing breaks and no copy is tracked', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    renderBooked();
    fireEvent.click(screen.getByTestId('lesson-plan-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByText(`${K}.copied`)).toBeNull();
    expect(track).not.toHaveBeenCalledWith('lesson_plan_link_copied', expect.anything());
  });
});
