/**
 * Tests for useAdminError hook
 * Verifies toast-based error handling for admin dashboard
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminError } from '../useAdminError';
import * as NeoToast from '@/components/NeoToast';

// Mock NeoToast
vi.mock('@/components/NeoToast', () => ({
  neoErrorToast: vi.fn(),
  neoSuccessToast: vi.fn(),
  neoWarningToast: vi.fn(),
  neoInfoToast: vi.fn(),
}));

describe('useAdminError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showError', () => {
    test('should call neoErrorToast with message and default options', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: showError is called
      act(() => {
        result.current.showError('Test error message');
      });

      // THEN: neoErrorToast is called with correct params
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith('Test error message', {
        icon: '✕',
        duration: 4000,
        id: undefined,
      });
    });

    test('should allow custom options', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: showError is called with custom options
      act(() => {
        result.current.showError('Custom error', {
          icon: '🔥',
          duration: 5000,
          id: 'custom-toast',
        });
      });

      // THEN: neoErrorToast is called with custom params
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith('Custom error', {
        icon: '🔥',
        duration: 5000,
        id: 'custom-toast',
      });
    });
  });

  describe('showSuccess', () => {
    test('should call neoSuccessToast with message and default options', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: showSuccess is called
      act(() => {
        result.current.showSuccess('Operation successful');
      });

      // THEN: neoSuccessToast is called with correct params
      expect(NeoToast.neoSuccessToast).toHaveBeenCalledWith('Operation successful', {
        icon: '✓',
        duration: 3000,
        id: undefined,
      });
    });
  });

  describe('showWarning', () => {
    test('should call neoWarningToast with message and default options', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: showWarning is called
      act(() => {
        result.current.showWarning('Warning message');
      });

      // THEN: neoWarningToast is called with correct params
      expect(NeoToast.neoWarningToast).toHaveBeenCalledWith('Warning message', {
        icon: '⚠',
        duration: 4000,
        id: undefined,
      });
    });
  });

  describe('showInfo', () => {
    test('should call neoInfoToast with message and default options', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: showInfo is called
      act(() => {
        result.current.showInfo('Info message');
      });

      // THEN: neoInfoToast is called with correct params
      expect(NeoToast.neoInfoToast).toHaveBeenCalledWith('Info message', {
        icon: 'ℹ',
        duration: 3000,
        id: undefined,
      });
    });
  });

  describe('handleError', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should extract message from Error objects', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called with an Error
      act(() => {
        result.current.handleError(new Error('Error from exception'));
      });

      // THEN: Toast shows the error message
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith('Error from exception', expect.any(Object));
    });

    test('should handle string errors', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called with a string
      act(() => {
        result.current.handleError('String error message');
      });

      // THEN: Toast shows the string message
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith('String error message', expect.any(Object));
    });

    test('should handle objects with message property', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called with an object containing message
      act(() => {
        result.current.handleError({ message: 'Object error message' });
      });

      // THEN: Toast shows the message from the object
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith('Object error message', expect.any(Object));
    });

    test('should use fallback message for unknown error types', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called with null
      act(() => {
        result.current.handleError(null);
      });

      // THEN: Toast shows the default fallback message
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith(
        'An unexpected error occurred',
        expect.any(Object)
      );
    });

    test('should use custom fallback message when provided', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called with null and custom fallback
      act(() => {
        result.current.handleError(null, 'Custom fallback message');
      });

      // THEN: Toast shows the custom fallback message
      expect(NeoToast.neoErrorToast).toHaveBeenCalledWith(
        'Custom fallback message',
        expect.any(Object)
      );
    });

    test('should log error to console', () => {
      // GIVEN: The hook is rendered
      const { result } = renderHook(() => useAdminError());

      // WHEN: handleError is called
      const testError = new Error('Test error');
      act(() => {
        result.current.handleError(testError);
      });

      // THEN: Error is logged to console
      expect(consoleSpy).toHaveBeenCalledWith('[Admin Error]', testError);
    });
  });
});
