/**
 * Tests for useConnectionQuality hook
 *
 * TDD RED phase: Tests for measuring RTT via Socket.IO latency checks,
 * computing rolling average/jitter, and exposing connection quality level.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useConnectionQuality } from '../useConnectionQuality';

// Helper to create a mock socket
function createMockSocket(overrides: Partial<Socket> = {}): Socket {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
    ...overrides,
  } as unknown as Socket;
}

describe('useConnectionQuality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear any navigator.connection mock
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================
  // Disconnected State
  // ==========================================

  describe('disconnected state', () => {
    it('should return disconnected when socket is null', () => {
      // GIVEN
      const socket = null;

      // WHEN
      const { result } = renderHook(() => useConnectionQuality(socket, false));

      // THEN
      expect(result.current.quality).toBe('disconnected');
      expect(result.current.averageRtt).toBe(0);
      expect(result.current.jitter).toBe(0);
      expect(result.current.samples).toEqual([]);
      expect(result.current.networkType).toBeNull();
    });

    it('should return disconnected when isConnected is false', () => {
      // GIVEN
      const socket = createMockSocket();

      // WHEN
      const { result } = renderHook(() => useConnectionQuality(socket, false));

      // THEN
      expect(result.current.quality).toBe('disconnected');
    });
  });

  // ==========================================
  // RTT Measurement
  // ==========================================

  describe('RTT measurement', () => {
    it('should emit latencyCheck every 5 seconds', () => {
      // GIVEN
      const socket = createMockSocket();

      // WHEN
      renderHook(() => useConnectionQuality(socket, true));

      // Advance past first interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // THEN
      expect(socket.emit).toHaveBeenCalledWith(
        'latencyCheck',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should measure RTT from emit callback timestamp delta', () => {
      // GIVEN
      const socket = createMockSocket();
      let emitCallback: (...args: unknown[]) => void;

      (socket.emit as any).mockImplementation(
        (event: string, _data: unknown, cb: (...args: unknown[]) => void) => {
          if (event === 'latencyCheck') {
            emitCallback = cb;
          }
        }
      );

      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN - trigger latency check and simulate 50ms RTT
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now) // timestamp sent in emit
        .mockReturnValueOnce(now + 50); // timestamp when callback fires

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        emitCallback!();
      });

      // THEN
      expect(result.current.samples).toContain(50);
      expect(result.current.averageRtt).toBe(50);
    });
  });

  // ==========================================
  // Rolling Average
  // ==========================================

  describe('rolling average', () => {
    it('should compute average from multiple samples', () => {
      // GIVEN
      const socket = createMockSocket();
      const rtts = [100, 200, 300];
      let callCount = 0;
      let emitCallback: (() => void) | null = null;

      const originalDateNow = Date.now;
      let mockNow = 1000;

      (socket.emit as any).mockImplementation(
        (_event: string, _data: unknown, cb: () => void) => {
          emitCallback = cb;
        }
      );

      vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN - simulate 3 RTT measurements
      for (const rtt of rtts) {
        mockNow = 1000 + callCount * 10000;

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        mockNow += rtt;

        act(() => {
          emitCallback!();
        });

        callCount++;
      }

      // THEN - average of [100, 200, 300] = 200
      expect(result.current.samples).toHaveLength(3);
      expect(result.current.averageRtt).toBe(200);
    });

    it('should keep only last 10 samples in rolling window', () => {
      // GIVEN
      const socket = createMockSocket();
      let emitCallback: (() => void) | null = null;
      let mockNow = 1000;

      (socket.emit as any).mockImplementation(
        (_event: string, _data: unknown, cb: () => void) => {
          emitCallback = cb;
        }
      );

      vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN - add 12 samples
      for (let i = 0; i < 12; i++) {
        mockNow = 1000 + i * 10000;

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        mockNow += (i + 1) * 10; // RTTs: 10, 20, 30, ..., 120

        act(() => {
          emitCallback!();
        });
      }

      // THEN - only last 10 samples kept
      expect(result.current.samples).toHaveLength(10);
      // First two samples (10, 20) should be dropped
      expect(result.current.samples).not.toContain(10);
      expect(result.current.samples).not.toContain(20);
      expect(result.current.samples[0]).toBe(30);
    });
  });

  // ==========================================
  // Jitter (Standard Deviation)
  // ==========================================

  describe('jitter calculation', () => {
    it('should return 0 jitter with single sample', () => {
      // GIVEN
      const socket = createMockSocket();
      let emitCallback: (() => void) | null = null;
      let mockNow = 1000;

      (socket.emit as any).mockImplementation(
        (_event: string, _data: unknown, cb: () => void) => {
          emitCallback = cb;
        }
      );

      vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      mockNow = 1100; // 100ms RTT

      act(() => {
        emitCallback!();
      });

      // THEN
      expect(result.current.jitter).toBe(0);
    });

    it('should compute jitter as standard deviation of samples', () => {
      // GIVEN
      const socket = createMockSocket();
      let emitCallback: (() => void) | null = null;
      let mockNow = 1000;

      (socket.emit as any).mockImplementation(
        (_event: string, _data: unknown, cb: () => void) => {
          emitCallback = cb;
        }
      );

      vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN - add samples [100, 200]
      const rtts = [100, 200];
      for (let i = 0; i < rtts.length; i++) {
        mockNow = 1000 + i * 10000;

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        mockNow += rtts[i];

        act(() => {
          emitCallback!();
        });
      }

      // THEN - std dev of [100, 200]: mean=150, variance=((100-150)^2 + (200-150)^2)/2 = 2500, std=50
      expect(result.current.jitter).toBe(50);
    });
  });

  // ==========================================
  // Quality Thresholds
  // ==========================================

  describe('quality levels', () => {
    // Helper to push a single RTT sample and get quality
    function setupWithRtt(rtt: number) {
      const socket = createMockSocket();
      let emitCallback: (() => void) | null = null;
      let mockNow = 1000;

      (socket.emit as any).mockImplementation(
        (_event: string, _data: unknown, cb: () => void) => {
          emitCallback = cb;
        }
      );

      vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

      const hookResult = renderHook(() => useConnectionQuality(socket, true));

      // Push one sample
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      mockNow = 1000 + rtt;

      act(() => {
        emitCallback!();
      });

      return hookResult;
    }

    it('should return excellent when average RTT < 100ms', () => {
      const { result } = setupWithRtt(50);
      expect(result.current.quality).toBe('excellent');
    });

    it('should return good when average RTT >= 100ms and < 300ms', () => {
      const { result } = setupWithRtt(150);
      expect(result.current.quality).toBe('good');
    });

    it('should return poor when average RTT >= 300ms and < 1000ms', () => {
      const { result } = setupWithRtt(500);
      expect(result.current.quality).toBe('poor');
    });

    it('should return critical when average RTT >= 1000ms', () => {
      const { result } = setupWithRtt(1500);
      expect(result.current.quality).toBe('critical');
    });

    it('should return excellent at exactly 99ms', () => {
      const { result } = setupWithRtt(99);
      expect(result.current.quality).toBe('excellent');
    });

    it('should return good at exactly 100ms', () => {
      const { result } = setupWithRtt(100);
      expect(result.current.quality).toBe('good');
    });

    it('should return poor at exactly 300ms', () => {
      const { result } = setupWithRtt(300);
      expect(result.current.quality).toBe('poor');
    });

    it('should return critical at exactly 1000ms', () => {
      const { result } = setupWithRtt(1000);
      expect(result.current.quality).toBe('critical');
    });
  });

  // ==========================================
  // Network Information API
  // ==========================================

  describe('Network Information API', () => {
    it('should expose networkType from navigator.connection.effectiveType', () => {
      // GIVEN
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        configurable: true,
        value: { effectiveType: '4g' },
      });

      const socket = createMockSocket();

      // WHEN
      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // THEN
      expect(result.current.networkType).toBe('4g');
    });

    it('should return null networkType when navigator.connection is unavailable', () => {
      // GIVEN - connection is undefined (set in beforeEach)
      const socket = createMockSocket();

      // WHEN
      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // THEN
      expect(result.current.networkType).toBeNull();
    });

    it('should handle slow-2g, 2g, 3g, 4g effective types', () => {
      // GIVEN
      const socket = createMockSocket();

      for (const type of ['slow-2g', '2g', '3g', '4g']) {
        Object.defineProperty(navigator, 'connection', {
          writable: true,
          configurable: true,
          value: { effectiveType: type },
        });

        // WHEN
        const { result } = renderHook(() => useConnectionQuality(socket, true));

        // THEN
        expect(result.current.networkType).toBe(type);
      }
    });
  });

  // ==========================================
  // Cleanup
  // ==========================================

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      // GIVEN
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const socket = createMockSocket();

      const { unmount } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN
      unmount();

      // THEN
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not emit latencyCheck after unmount', () => {
      // GIVEN
      const socket = createMockSocket();
      const { unmount } = renderHook(() => useConnectionQuality(socket, true));

      // WHEN
      unmount();
      (socket.emit as any).mockClear();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // THEN
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should clear interval when socket disconnects', () => {
      // GIVEN
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const socket = createMockSocket();

      const { rerender } = renderHook(
        ({ isConnected }) => useConnectionQuality(socket, isConnected),
        { initialProps: { isConnected: true } }
      );

      // WHEN
      rerender({ isConnected: false });

      // THEN
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Return Shape
  // ==========================================

  describe('return value shape', () => {
    it('should expose averageRtt, jitter, quality, networkType, samples', () => {
      // GIVEN
      const socket = createMockSocket();

      // WHEN
      const { result } = renderHook(() => useConnectionQuality(socket, true));

      // THEN
      expect(result.current).toHaveProperty('averageRtt');
      expect(result.current).toHaveProperty('jitter');
      expect(result.current).toHaveProperty('quality');
      expect(result.current).toHaveProperty('networkType');
      expect(result.current).toHaveProperty('samples');
      expect(typeof result.current.averageRtt).toBe('number');
      expect(typeof result.current.jitter).toBe('number');
      expect(typeof result.current.quality).toBe('string');
      expect(
        result.current.networkType === null ||
          typeof result.current.networkType === 'string'
      ).toBe(true);
      expect(Array.isArray(result.current.samples)).toBe(true);
    });
  });
});
