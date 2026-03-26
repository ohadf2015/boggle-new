import { vi } from 'vitest';
/**
 * Tests for Supabase Realtime Subscriptions
 * Tests subscribeToClassroomProgress function for real-time classroom updates
 */

describe('subscribeToClassroomProgress', () => {
  // Simplified tests that verify the function exists and basic behavior
  // Full integration testing will be done at hook level with proper mocking

  it('should be exported from module', () => {
    // Dynamic import to avoid module caching issues
    return import('../supabaseRealtime').then(module => {
      expect(module.subscribeToClassroomProgress).toBeDefined();
      expect(typeof module.subscribeToClassroomProgress).toBe('function');
    });
  });

  it('should return unsubscribe function', () => {
    return import('../supabaseRealtime').then(module => {
      const unsubscribe = module.subscribeToClassroomProgress('test-id', vi.fn());
      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw
    });
  });

  it('should handle missing classroomId gracefully', () => {
    return import('../supabaseRealtime').then(module => {
      const unsubscribe = module.subscribeToClassroomProgress('', vi.fn());
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  it('should expose cleanupAllSubscriptions', () => {
    return import('../supabaseRealtime').then(module => {
      expect(module.cleanupAllSubscriptions).toBeDefined();
      expect(typeof module.cleanupAllSubscriptions).toBe('function');
      module.cleanupAllSubscriptions(); // Should not throw
    });
  });

  it('should expose getActiveSubscriptions', () => {
    return import('../supabaseRealtime').then(module => {
      expect(module.getActiveSubscriptions).toBeDefined();
      expect(typeof module.getActiveSubscriptions).toBe('function');
      const subscriptions = module.getActiveSubscriptions();
      expect(Array.isArray(subscriptions)).toBe(true);
    });
  });
});
