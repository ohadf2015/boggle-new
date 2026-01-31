/**
 * Tests for /student/lessons redirect page
 *
 * This page exists only to handle direct navigation to /student/lessons
 * (without a lesson ID) by redirecting to the student dashboard.
 */

import { redirect } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('StudentLessonsPage', () => {
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should redirect to student dashboard with Hebrew locale', async () => {
    // GIVEN
    const params = Promise.resolve({ locale: 'he' });

    // WHEN
    const { default: StudentLessonsPage } = await import('../page');
    await StudentLessonsPage({ params });

    // THEN
    expect(mockRedirect).toHaveBeenCalledWith('/he/student');
  });

  test('should redirect to student dashboard with English locale', async () => {
    // GIVEN
    const params = Promise.resolve({ locale: 'en' });

    // WHEN
    const { default: StudentLessonsPage } = await import('../page');
    await StudentLessonsPage({ params });

    // THEN
    expect(mockRedirect).toHaveBeenCalledWith('/en/student');
  });

  test('should redirect to student dashboard with Swedish locale', async () => {
    // GIVEN
    const params = Promise.resolve({ locale: 'sv' });

    // WHEN
    const { default: StudentLessonsPage } = await import('../page');
    await StudentLessonsPage({ params });

    // THEN
    expect(mockRedirect).toHaveBeenCalledWith('/sv/student');
  });
});
