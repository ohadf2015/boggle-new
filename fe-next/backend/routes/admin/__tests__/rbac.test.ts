/**
 * Tests for role-based access control middleware
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { requireAdminRole, hasPermission, type AdminRole } from '../rbac';

describe('RBAC', () => {
  describe('hasPermission', () => {
    it('should allow superadmin for all roles', () => {
      expect(hasPermission('superadmin', 'viewer')).toBe(true);
      expect(hasPermission('superadmin', 'moderator')).toBe(true);
      expect(hasPermission('superadmin', 'operator')).toBe(true);
      expect(hasPermission('superadmin', 'superadmin')).toBe(true);
    });

    it('should deny viewer for higher roles', () => {
      expect(hasPermission('viewer', 'moderator')).toBe(false);
      expect(hasPermission('viewer', 'operator')).toBe(false);
      expect(hasPermission('viewer', 'superadmin')).toBe(false);
    });

    it('should allow equal role level', () => {
      expect(hasPermission('moderator', 'moderator')).toBe(true);
      expect(hasPermission('viewer', 'viewer')).toBe(true);
    });

    it('should allow higher role for lower requirement', () => {
      expect(hasPermission('operator', 'viewer')).toBe(true);
      expect(hasPermission('moderator', 'viewer')).toBe(true);
    });
  });

  describe('requireAdminRole middleware', () => {
    const createMockReqRes = (role?: AdminRole) => {
      const req = { adminUser: role ? { id: '1', email: 'a@b.com', admin_role: role } : undefined } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;
      const next = vi.fn();
      return { req, res, next };
    };

    it('should call next for sufficient role', () => {
      const { req, res, next } = createMockReqRes('operator');
      requireAdminRole('viewer')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for insufficient role', () => {
      const { req, res, next } = createMockReqRes('viewer');
      requireAdminRole('superadmin')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect((res as { status: Mock }).status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when no adminUser', () => {
      const { req, res, next } = createMockReqRes();
      requireAdminRole('viewer')(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
