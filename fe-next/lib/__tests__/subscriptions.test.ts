import { describe, it, expect, vi } from 'vitest';
import {
  checkTeacherSubscription,
  canCreateClass,
  canAddStudent,
} from '../subscriptions';
import { createClient } from '@/utils/supabase/server';

// Mock Supabase
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Subscription tier limits', () => {
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

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(2);
    });

    it('should allow free teacher at limit - 1 (1 class, can create 1 more)', async () => {
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
                  count: 1,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should block free teacher at limit (2 classes)', async () => {
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
                  count: 2,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await canCreateClass('user-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('free tier limit');
      expect(result.currentCount).toBe(2);
      expect(result.limit).toBe(2);
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

      const result = await canCreateClass('user-123');

      // Non-active pro → treat as free
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(2);
    });
  });

  describe('canAddStudent', () => {
    it('should allow adding student to free classroom under limit (10 members)', async () => {
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
                  count: 10,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(10);
      expect(result.limit).toBe(30);
    });

    it('should allow adding student to free classroom at limit - 1 (29 members)', async () => {
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
                  count: 29,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(29);
    });

    it('should block adding student to free classroom at limit (30 members)', async () => {
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
                  count: 30,
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('30 students');
      expect(result.currentCount).toBe(30);
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

      const result = await canAddStudent('classroom-123');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(null); // unlimited
    });
  });
});
