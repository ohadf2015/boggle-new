import { describe, it, expect, vi, beforeEach } from 'vitest';

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const connectionMock = vi.fn(async () => undefined);

vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));

vi.mock('next/server', () => ({
  connection: () => connectionMock(),
}));

import { notFoundInProduction } from '../devOnlyRoute';

describe('notFoundInProduction', () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    connectionMock.mockClear();
  });

  it('throws notFound when running a production build', async () => {
    await expect(notFoundInProduction({ NODE_ENV: 'production' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('lets the page render outside production', async () => {
    await expect(notFoundInProduction({ NODE_ENV: 'development' })).resolves.toBeUndefined();
    await expect(notFoundInProduction({ NODE_ENV: 'test' })).resolves.toBeUndefined();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('lets a production build serve the page when ENABLE_QA_ROUTES=1', async () => {
    await expect(
      notFoundInProduction({ NODE_ENV: 'production', ENABLE_QA_ROUTES: '1' }),
    ).resolves.toBeUndefined();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('defers to request time so the build cannot bake in the 404', async () => {
    await notFoundInProduction({ NODE_ENV: 'development' });
    expect(connectionMock).toHaveBeenCalledTimes(1);
  });
});
