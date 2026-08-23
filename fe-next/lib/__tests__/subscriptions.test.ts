import { describe, it, expect, vi } from 'vitest';
import {
  checkTeacherSubscription,
  canCreateClass,
  canAddStudent,
} from '../subscriptions';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

// Mock Supabase
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Subscription tier limits', () => {
  // Asserted against the shared constant, never a retyped number: this suite pinned
  // 2/30 and went red the moment the paywall was tightened on 2026-08-23. The scenarios
  // below are expressed RELATIVE to the limit so the next change needs no edits here.
  const CLASSES = FREE_TIER_LIMITS.classes;
  const STUDENTS = FREE_TIER_LIMITS.studentsPerClass;

  describe('canCreateClass', () => {
    it('should allow free teacher under limit (0 classes)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  tier: 'free',
                  status: 'active',
                  current_period_end: null,
                  cancel_at_period_end: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      // First call for subscriptions, second for classrooms count
      const fromCalls: any[] = [];
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    tier: 'free',
                    status: 'active',
                    current_period_end: null,
                    cancel_at_period_end: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'classrooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((callback) => {
                  callback({
                    count: 0,
                    error: null,
                  });
                  return Promise.resolve({ count: 0, error: null });
                }),
              }),
            }),
          };
        }
      });

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(CLASSES);
    });

    it('should allow a free teacher one below the class limit', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: CLASSES - 1,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(CLASSES - 1);
      expect(result.limit).toBe(CLASSES);
    });

    it('should block a free teacher at the class limit', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: CLASSES,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('free tier limit');
      expect(result.currentCount).toBe(CLASSES);
      expect(result.limit).toBe(CLASSES);
    });

    it('should block free teacher grandfathered over limit (5 classes, cannot add 6th)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 5,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(5);
      // Grandfathering: they can't add a 6th but keep their 5
    });

    it('should allow pro teacher unlimited classes', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'pro',
                      status: 'active',
                      current_period_end: '2025-08-15',
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 100,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(null); // unlimited
    });

    it('should block pro user with non-active subscription', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'pro',
                      status: 'canceled',
                      current_period_end: '2025-08-15',
                      cancel_at_period_end: true,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 3,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      // Non-active pro → treat as free
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(CLASSES);
    });
  });

  describe('canAddStudent', () => {
    it('should allow adding a student to an empty free classroom', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ teacher_id: 'teacher-123' }],
                  error: null,
                }),
              }),
            };
          } else if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classroom_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(STUDENTS);
    });

    it('should allow adding a student one below the student limit', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ teacher_id: 'teacher-123' }],
                  error: null,
                }),
              }),
            };
          } else if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classroom_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: STUDENTS - 1,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(STUDENTS - 1);
    });

    it('should block adding a student at the student limit', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ teacher_id: 'teacher-123' }],
                  error: null,
                }),
              }),
            };
          } else if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'free',
                      status: 'active',
                      current_period_end: null,
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classroom_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: STUDENTS,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain(`${STUDENTS} students`);
      expect(result.currentCount).toBe(STUDENTS);
    });

    it('should allow pro teacher unlimited students in classroom', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'classrooms') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ teacher_id: 'teacher-123' }],
                  error: null,
                }),
              }),
            };
          } else if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      tier: 'pro',
                      status: 'active',
                      current_period_end: '2025-08-15',
                      cancel_at_period_end: false,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else if (table === 'classroom_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 500,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      // canAddStudent/checkTeacherSubscription read entitlement state with the service-role
      // client (RLS hides the teacher's rows from a joining student). Same fixture stands in
      // for the database either way.
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(null); // unlimited
    });
  });
});
