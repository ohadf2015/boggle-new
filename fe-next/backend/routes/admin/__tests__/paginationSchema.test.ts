/**
 * Tests for pagination schema validation
 */

import { paginationSchema } from '../paginationSchema';

describe('paginationSchema', () => {
  it('should apply defaults when no params given', () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(result.cursor).toBeUndefined();
  });

  it('should parse string numbers (from query params)', () => {
    const result = paginationSchema.parse({ limit: '25', offset: '100' });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(100);
  });

  it('should clamp limit to max 500', () => {
    expect(() => paginationSchema.parse({ limit: '1000' })).toThrow();
  });

  it('should reject limit below 1', () => {
    expect(() => paginationSchema.parse({ limit: '0' })).toThrow();
  });

  it('should reject negative offset', () => {
    expect(() => paginationSchema.parse({ offset: '-1' })).toThrow();
  });

  it('should accept optional cursor string', () => {
    const result = paginationSchema.parse({ cursor: '2026-03-14T00:00:00Z' });
    expect(result.cursor).toBe('2026-03-14T00:00:00Z');
  });
});
