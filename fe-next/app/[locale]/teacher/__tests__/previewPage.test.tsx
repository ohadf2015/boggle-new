import { describe, it, expect, vi, afterEach } from 'vitest';

const notFound = vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/teacher/home/TeacherHomePreview', () => ({ TeacherHomePreview: () => null }));

const props = (state?: string) => ({ searchParams: Promise.resolve(state ? { state } : {}) });

describe('teacher home preview route', () => {
  afterEach(() => { vi.unstubAllEnvs(); notFound.mockClear(); });

  it('Given production, When the preview is requested, Then it 404s', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { default: Page } = await import('../preview/page');
    await expect(Page(props())).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Given development and ?state=empty, Then it renders the preview in that state', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { default: Page } = await import('../preview/page');
    const el = (await Page(props('empty'))) as { props: { state: string } };
    expect(el.props.state).toBe('empty');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('Given an unknown state, Then it falls back to the class desk', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { default: Page } = await import('../preview/page');
    const el = (await Page(props('bogus'))) as { props: { state: string } };
    expect(el.props.state).toBe('classes');
  });
});
