// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * The public parent-report page. No account, no auth — the token IS the
 * access control. Everything here must fail closed: any missing/expired/
 * tampered token, missing service role, non-member student, or a query
 * error all render the SAME friendly "link not available" view, and none
 * of them ever touch the (mocked) service-role client further than needed.
 */

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/education/parentReportData', () => ({ loadParentReportData: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/backend/utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));

import Page, { generateMetadata } from '../page';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadParentReportData } from '@/lib/education/parentReportData';
import { signParentReportToken } from '@/lib/education/parentReportToken';
import logger from '@/utils/logger';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';

const STUDENT = 'student-1';
const CLASSROOM = 'classroom-1';

const params = (locale: string, token: string) => Promise.resolve({ locale, token });

describe('parent report page', () => {
  const ORIGINAL_SECRET = process.env.PARENT_REPORT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PARENT_REPORT_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.PARENT_REPORT_SECRET;
    else process.env.PARENT_REPORT_SECRET = ORIGINAL_SECRET;
  });

  describe('generateMetadata', () => {
    it('always sets robots noindex,nofollow regardless of token validity', async () => {
      const meta = await generateMetadata({ params: params('en', 'garbage') });
      expect(meta.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
    });

    it('never includes the student name (privacy: no PII in link previews)', async () => {
      const token = signParentReportToken(STUDENT, CLASSROOM);
      const meta = await generateMetadata({ params: params('en', token) });
      expect(String(meta.title)).not.toMatch(/Ana/);
    });
  });

  describe('invalid / expired / tampered token', () => {
    it('renders the friendly error view for a malformed token, without ever calling the service-role client', async () => {
      const { container } = render(await Page({ params: params('en', 'not-a-real-token') }));

      expect(container.textContent).toContain('Link not available');
      expect(createAdminClient).not.toHaveBeenCalled();
      expect(loadParentReportData).not.toHaveBeenCalled();
      expect(captureEduServerEvents).not.toHaveBeenCalled();
    });

    it('renders the friendly error view for an expired token', async () => {
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken(STUDENT, CLASSROOM, now);
      vi.setSystemTime(now + 31 * 24 * 60 * 60 * 1000);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('Link not available');
      vi.useRealTimers();
    });
  });

  describe('service role / data errors — all fail closed to the same friendly view', () => {
    it('when the service-role client is not configured, logs and shows the error view', async () => {
      (createAdminClient as any).mockReturnValue(null);
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('Link not available');
      expect(logger.error).toHaveBeenCalled();
      expect(loadParentReportData).not.toHaveBeenCalled();
    });

    it('when the student is no longer a classroom member, shows the error view', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'not_member' });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('Link not available');
      expect(captureEduServerEvents).not.toHaveBeenCalled();
    });

    it('when the data query errors, logs (never silently) and shows the error view', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'error', message: 'db down' });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('Link not available');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('valid token with data', () => {
    const okData = {
      displayName: 'Ana',
      totalXp: 120,
      lessonsCompleted: 4,
      wordsMastered: 17,
      recentActivity: [{ completedAt: '2026-01-05T00:00:00.000Z' }],
    };

    it('renders the student name, stats, and recent activity', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('Ana');
      expect(container.textContent).toContain('120');
      expect(container.textContent).toContain('4');
      expect(container.textContent).toContain('17');
    });

    it('stamps parent_report_viewed server-side with the class and locale, never the student', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      await Page({ params: params('he', token) });

      expect(captureEduServerEvents).toHaveBeenCalledTimes(1);
      const [[events]] = (captureEduServerEvents as any).mock.calls;
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ event: 'parent_report_viewed', properties: { classroom_id: CLASSROOM, locale: 'he' } });
      expect(JSON.stringify(events[0])).not.toContain(STUDENT);
    });

    it('Given a parent with no class code, Then the footer invites them to play today\'s public puzzle, not the student join page', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { getByTestId } = render(await Page({ params: params('he', token) }));

      const link = getByTestId('parent-report-play');
      expect(link).toHaveAttribute('href', '/he/daily?utm_source=parent_report&utm_medium=referral');
      expect(link.getAttribute('href')).not.toContain('/join');
      expect(link.className).toContain('print:hidden');
    });

    it('renders "no activity yet" when recentActivity is empty', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({
        status: 'ok',
        data: { ...okData, recentActivity: [] },
      });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('No activity yet');
    });

    it('offers all 6 locales as links to the same token, never embedding the locale in the token', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('en', token) }));

      for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
        const link = container.querySelector(`a[href="/${locale}/report/${token}"]`);
        expect(link).not.toBeNull();
      }
    });

    it('an old-shape summary (no insights, class or teacher) renders cleanly with the new sections hidden', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container, queryByTestId } = render(await Page({ params: params('en', token) }));

      expect(queryByTestId('report-insight')).toBeNull();
      expect(queryByTestId('report-teacher')).toBeNull();
      expect(container.textContent).not.toMatch(/undefined|NaN|parentReport\./);
    });

    it('a full summary shows class, teacher, period, the insight body and a print button', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({
        status: 'ok',
        data: {
          ...okData,
          classroomName: '5B English',
          teacherName: 'Ms. Levi',
          generatedAt: '2026-10-21T12:00:00.000Z',
          insights: {
            totalXp: 120, lessonsCompleted: 4, wordsMastered: 17, wordsPracticed: 20, accuracy: 72,
            currentStreak: 3, longestStreak: 5,
            thisWeek: { sessions: 3, minutes: 25, activeDays: 2, accuracy: 70 },
            lastWeek: { sessions: 1, minutes: 5, activeDays: 1, accuracy: 50 },
            wordsToPractice: [{ word: 'sun', accuracy: 25, attempts: 4 }],
            recentWins: [{ word: 'tree', accuracy: 100, attempts: 3 }],
            insight: 'more_active', activity: 'practice_weak_words',
          },
        },
      });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container, getByTestId, getByRole } = render(await Page({ params: params('en', token) }));

      expect(container.textContent).toContain('5B English');
      expect(getByTestId('report-teacher').textContent).toContain('Ms. Levi');
      expect(getByTestId('report-period').textContent).toMatch(/Oct/);
      expect(getByTestId('report-insight').textContent).toContain('Ana');
      expect(getByRole('button', { name: /print/i })).toBeTruthy();
    });

    it('renders Hebrew right-to-left', async () => {
      (createAdminClient as any).mockReturnValue({});
      (loadParentReportData as any).mockResolvedValue({ status: 'ok', data: okData });
      const token = signParentReportToken(STUDENT, CLASSROOM);

      const { container } = render(await Page({ params: params('he', token) }));

      expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    });
  });
});
