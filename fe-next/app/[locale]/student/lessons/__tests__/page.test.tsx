import { vi } from 'vitest';
/**
 * /student/lessons is the lesson list, not a redirect.
 *
 * It used to `redirect()` to `/student`. The Academy map's dock links "Lessons"
 * here, so the redirect turned that button into a round trip back to the map
 * (and a second pass through the hub's profile wait). The page now renders the
 * list client (`./PageClient`); the list's behaviour is covered in
 * app/[locale]/student/__tests__/subpageRenders.test.tsx.
 */

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }));
vi.mock('../PageClient', () => ({ default: function StudentLessonsPageClient() { return null; } }));
vi.mock('@/lib/seo/generatePageMetadata', () => ({ generatePageMetadata: vi.fn(() => ({})) }));

describe('StudentLessonsPage', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  test.each(['he', 'en', 'sv'])('does not redirect away (%s) — it renders the lessons list', async () => {
    const { default: StudentLessonsPage } = await import('../page');
    const el = StudentLessonsPage() as { type: { name?: string } };
    expect(redirect).not.toHaveBeenCalled();
    expect(el.type.name).toBe('StudentLessonsPageClient');
  });

  test('stays out of the index', async () => {
    const { generatePageMetadata } = await import('@/lib/seo/generatePageMetadata');
    const { generateMetadata } = await import('../page');
    await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(generatePageMetadata).toHaveBeenCalledWith(expect.objectContaining({ path: '/student/lessons', noIndex: true }));
  });
});
