import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { SCROLL_QUIET_MS } from '@/lib/perf/runWhenScrollSettles';
import { isFeedbackWidgetHiddenPath } from '@/lib/feedback/feedbackWidgetRoutes';

/**
 * The yellow feedback launcher sat in the corner of the student practice card
 * and rode the projected class board. Student play pages and the live board run
 * without it; teacher and player pages keep it.
 */

let pathname = '/en/join/practice';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import FeedbackDevtoolsWidget, { FEEDBACK_WIDGET_SCRIPT_ID } from '../FeedbackDevtoolsWidget';

const originalLocation = window.location;
const originalFlag = process.env.NEXT_PUBLIC_FDT_ENABLED;
const script = () => document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID);
const gesture = async () => {
    await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
    act(() => { vi.advanceTimersByTime(SCROLL_QUIET_MS + 50); });
};

beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, hostname: 'www.lexiclash.live' } });
    process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
});

afterEach(() => {
    vi.useRealTimers();
    script()?.remove();
    delete (window as unknown as { feedbackDevTools?: unknown }).feedbackDevTools;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
    else process.env.NEXT_PUBLIC_FDT_ENABLED = originalFlag;
});

describe('isFeedbackWidgetHiddenPath', () => {
    it.each([
        '/en/join', '/he/join/AB3K9Z', '/en/join/practice', '/join', '/en/student/join',
        '/en/student/lessons/42', '/student', '/en/education/live', '/en/education/live/host',
    ])('hides on %s', (p) => expect(isFeedbackWidgetHiddenPath(p)).toBe(true));

    it.each([
        '/en', '/en/teacher', '/en/teacher/classroom/new', '/en/education', '/en/multiplayer', '/en/joinery', null,
    ])('keeps it on %s', (p) => expect(isFeedbackWidgetHiddenPath(p)).toBe(false));
});

describe('<FeedbackDevtoolsWidget> on student pages', () => {
    it('Given a student practice page, When the student taps, Then no widget script loads', async () => {
        pathname = '/en/join/practice';
        render(<FeedbackDevtoolsWidget lang="en" />);
        await gesture();
        expect(script()).toBeNull();
    });

    it('Given a teacher page, When the teacher taps, Then the widget loads', async () => {
        pathname = '/en/teacher';
        render(<FeedbackDevtoolsWidget lang="en" />);
        await gesture();
        expect(script()).not.toBeNull();
    });

    it('Given the first tap was on a student page, When they move to a teacher page, Then the widget loads there', async () => {
        pathname = '/en/join';
        const { rerender } = render(<FeedbackDevtoolsWidget lang="en" />);
        await gesture();
        expect(script()).toBeNull();
        pathname = '/en/teacher';
        rerender(<FeedbackDevtoolsWidget lang="en" />);
        expect(script()).not.toBeNull();
    });

    it('Given a mounted widget, When the teacher opens the live class board, Then it is destroyed, and re-inits on the way back', async () => {
        pathname = '/en/teacher';
        const { rerender } = render(<FeedbackDevtoolsWidget lang="en" />);
        await gesture();
        const api = { active: true, init: vi.fn(() => { api.active = true; return true; }), destroy: vi.fn(() => { api.active = false; }) };
        (window as unknown as { feedbackDevTools: typeof api }).feedbackDevTools = api;
        pathname = '/en/education/live/host';
        rerender(<FeedbackDevtoolsWidget lang="en" />);
        expect(api.destroy).toHaveBeenCalledTimes(1);
        pathname = '/en/teacher';
        rerender(<FeedbackDevtoolsWidget lang="en" />);
        expect(api.init).toHaveBeenCalledWith({ locale: 'en' });
    });
});
