/**
 * Role-Based Access Control for admin routes.
 * Defines admin role hierarchy and middleware for permission checks.
 */

import { Response, NextFunction } from 'express';
import type { AdminRequest } from './types';

export type AdminRole = 'viewer' | 'moderator' | 'operator' | 'superadmin';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  viewer: 1,
  moderator: 2,
  operator: 3,
  superadmin: 4,
};

/**
 * Check if a user's role meets the minimum required role.
 */
export function hasPermission(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Express middleware that gates a route behind a minimum admin role.
 */
export function requireAdminRole(minRole: AdminRole) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    const adminUser = req.adminUser as (AdminRequest['adminUser'] & { admin_role?: AdminRole }) | undefined;
    const userRole = adminUser?.admin_role as AdminRole | undefined;

    if (!userRole || !hasPermission(userRole, minRole)) {
      res.status(403).json({
        ok: false,
        error: { code: 'INSUFFICIENT_ROLE', message: `Requires ${minRole} or higher` },
      });
      return;
    }

    next();
  };
}
