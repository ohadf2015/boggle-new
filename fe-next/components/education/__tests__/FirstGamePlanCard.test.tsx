import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const tel = vi.hoisted(() => ({ scheduled: vi.fn(), homeLink: vi.fn() }));
vi.mock('@/lib/education/firstGamePlanTelemetry', () => ({ trackFirstGameScheduled: tel.scheduled, trackHomePracticeLinkSent: tel.homeLink }));

import { FirstGamePlanCard } from '../FirstGamePlanCard';

const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const classroom = { id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' };
const props = { classroom, joinUrl: 'https://x.test/en/join/BLDA7Q', origin: 'https://x.test', language: 'en', t };

describe('FirstGamePlanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  it('Given a new class, Then the time defaults to 9:00 tomorrow', () => {
    render(<FirstGamePlanCard {...props} />);
    const value = (screen.getByTestId('first-game-plan-when') as HTMLInputElement).value;
    expect(value).toMatch(/T09:00$/);
  });

  it('Given Add to Google Calendar, Then it opens a Google event with the class name, the join link and a start link back to this class', () => {
    render(<FirstGamePlanCard {...props} />);
    fireEvent.click(screen.getByTestId('first-game-plan-google'));
    const opened = new URL((window.open as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]);
    expect(opened.hostname).toBe('calendar.google.com');
    expect(opened.searchParams.get('text')).toContain('Room 7');
    const details = opened.searchParams.get('details') ?? '';
    expect(details).toContain('https://x.test/en/join/BLDA7Q');
    expect(details).toContain('classroomId=c1');
    expect(details).toContain('utm_campaign=edu_first_game');
    expect(tel.scheduled).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'c1', target: 'google', locale: 'en' }));
    expect(screen.getByTestId('first-game-plan-added')).toBeInTheDocument();
  });

  it('Given the .ics option, Then it downloads a file and opens no tab', () => {
    const create = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    render(<FirstGamePlanCard {...props} />);
    fireEvent.click(screen.getByTestId('first-game-plan-ics'));
    expect(create).toHaveBeenCalledTimes(1);
    expect(window.open).not.toHaveBeenCalled();
    expect(tel.scheduled).toHaveBeenCalledWith(expect.objectContaining({ target: 'ics' }));
  });

  it('Given the time is cleared, Then both buttons are disabled and nothing is tracked', () => {
    render(<FirstGamePlanCard {...props} />);
    fireEvent.change(screen.getByTestId('first-game-plan-when'), { target: { value: '' } });
    expect(screen.getByTestId('first-game-plan-google')).toBeDisabled();
    expect(screen.getByTestId('first-game-plan-ics')).toBeDisabled();
    fireEvent.click(screen.getByTestId('first-game-plan-google'));
    expect(tel.scheduled).not.toHaveBeenCalled();
  });

  it('Given the teacher changes the time after adding, Then the "added" note clears so it never describes the old time', () => {
    render(<FirstGamePlanCard {...props} />);
    fireEvent.click(screen.getByTestId('first-game-plan-google'));
    fireEvent.change(screen.getByTestId('first-game-plan-when'), { target: { value: '2030-01-07T10:30' } });
    expect(screen.queryByTestId('first-game-plan-added')).toBeNull();
  });

  it('Given the class has a word list, Then a second way shows: send the link now so students practise at home', () => {
    const send = vi.fn();
    render(<FirstGamePlanCard {...props} onSendHomeLink={send} />);
    expect(screen.getByTestId('first-game-plan-home')).toHaveTextContent('eduShell.setup.plan.homeTitle');
    fireEvent.click(screen.getByTestId('first-game-plan-home-send'));
    expect(send).toHaveBeenCalledTimes(1);
    expect(tel.homeLink).toHaveBeenCalledWith({ classroomId: 'c1', locale: 'en' });
  });

  it('Given no word list on the class, Then there is no home-practice row, since students would have nothing to practise', () => {
    render(<FirstGamePlanCard {...props} />);
    expect(screen.queryByTestId('first-game-plan-home')).toBeNull();
  });
});
