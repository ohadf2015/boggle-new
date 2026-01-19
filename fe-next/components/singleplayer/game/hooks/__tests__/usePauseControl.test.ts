import { renderHook, act } from '@testing-library/react';
import { usePauseControl } from '../usePauseControl';

describe('usePauseControl', () => {
  describe('initial state', () => {
    it('should not be paused initially', () => {
      const { result } = renderHook(() => usePauseControl());

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('togglePause', () => {
    it('should toggle pause state', () => {
      const { result } = renderHook(() => usePauseControl());

      expect(result.current.isPaused).toBe(false);

      act(() => {
        result.current.togglePause();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.togglePause();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should not toggle when allowPause is false', () => {
      const { result } = renderHook(() => usePauseControl({ allowPause: false }));

      expect(result.current.isPaused).toBe(false);

      act(() => {
        result.current.togglePause();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('setPaused', () => {
    it('should set pause state explicitly', () => {
      const { result } = renderHook(() => usePauseControl());

      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.setPaused(false);
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should not allow setting paused to true when allowPause is false', () => {
      const { result } = renderHook(() => usePauseControl({ allowPause: false }));

      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should allow setting paused to false when allowPause is false', () => {
      // Start with allowPause true, pause, then set to false
      const { result, rerender } = renderHook(
        (props) => usePauseControl(props),
        { initialProps: { allowPause: true } }
      );

      act(() => {
        result.current.setPaused(true);
      });
      expect(result.current.isPaused).toBe(true);

      // Now disable pause
      rerender({ allowPause: false });

      // Should still be able to unpause
      act(() => {
        result.current.setPaused(false);
      });
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resetPause', () => {
    it('should reset pause state to false', () => {
      const { result } = renderHook(() => usePauseControl());

      act(() => {
        result.current.setPaused(true);
      });
      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resetPause();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });
});
