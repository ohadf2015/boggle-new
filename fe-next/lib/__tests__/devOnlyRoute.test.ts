import { describe, it, expect, vi, beforeEach } from 'vitest';

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));

import { notFoundInProduction } from '../devOnlyRoute';

describe('notFoundInProduction', () => {
  beforeEach(() => {
    notFoundMock.mockClear();
  });

  it('throws notFound when running a production build', () => {
    expect(() => notFoundInProduction('production')).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('lets the page render outside production', () => {
    expect(() => notFoundInProduction('development')).not.toThrow();
    expect(() => notFoundInProduction('test')).not.toThrow();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
