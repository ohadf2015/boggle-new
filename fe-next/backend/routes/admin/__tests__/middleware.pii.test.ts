/**
 * Tests for PII scrubbing in audit log
 */

import { scrubPII } from '../middleware';

describe('PII scrubbing', () => {
  it('should remove email from details', () => {
    const result = scrubPII({ action: 'ban', email: 'user@example.com', reason: 'spam' });
    expect(result).toEqual({ action: 'ban', reason: 'spam' });
    expect(result).not.toHaveProperty('email');
  });

  it('should remove common PII keys', () => {
    const result = scrubPII({
      id: '123',
      email: 'x@y.com',
      phone: '+1234',
      ip: '1.2.3.4',
      ip_address: '5.6.7.8',
      password: 'secret',
      token: 'jwt...',
      action: 'test',
    });
    expect(Object.keys(result)).toEqual(['id', 'action']);
  });

  it('should pass through clean objects unchanged', () => {
    const input = { userId: '123', reason: 'test', count: 5 };
    expect(scrubPII(input)).toEqual(input);
  });

  it('should handle empty objects', () => {
    expect(scrubPII({})).toEqual({});
  });
});
