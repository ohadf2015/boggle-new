import { describe, it, expect, vi, afterEach } from 'vitest';

const notFound = vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
vi.mock('next/navigation', () => ({ notFound }));

describe('dev route layout', () => {
  afterEach(() => { vi.unstubAllEnvs(); notFound.mockClear(); });

  it('Given production, When a dev harness is requested, Then it 404s', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { default: DevLayout } = await import('../layout');
    expect(() => DevLayout({ children: null })).toThrow('NEXT_NOT_FOUND');
  });

  it('Given development, When a dev harness is requested, Then it renders its children', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { default: DevLayout } = await import('../layout');
    expect(DevLayout({ children: 'harness' })).toBe('harness');
    expect(notFound).not.toHaveBeenCalled();
  });
});
