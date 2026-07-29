/**
 * useSafeSocketEvent - Safe socket event listener hook with error handling
 *
 * Features:
 * - Automatic cleanup on unmount
 * - Error handling with fallback
 * - Enabled/disabled state support
 * - Type-safe event handling
 * - Stable callback references with useRef
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface UseSafeSocketEventOptions<T> {
  /** Socket instance */
  socket: Socket | null;
  /** Event name to listen for */
  event: string;
  /** Handler function called when event is received */
  handler: (data: T) => void | Promise<void>;
  /** Whether the listener is enabled (default: true) */
  enabled?: boolean;
  /** Error handler callback */
  onError?: (error: Error) => void;
  /** Dependencies for re-subscribing (optional) */
  deps?: React.DependencyList;
}

/**
 * Hook for safely listening to socket events with automatic cleanup
 *
 * @example
 * ```tsx
 * useSafeSocketEvent({
 *   socket,
 *   event: 'game-update',
 *   handler: (data) => {
 *     setGameState(data);
 *   },
 *   enabled: isConnected,
 *   onError: (error) => {
 *     console.error('Game update error:', error);
 *   }
 * });
 * ```
 */
export function useSafeSocketEvent<T = unknown>({
  socket,
  event,
  handler,
  enabled = true,
  onError,
  deps = [],
}: UseSafeSocketEventOptions<T>): void {
  // Use refs to keep handlers stable and avoid stale closures
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!socket || !enabled) return;

    const safeHandler = async (data: T) => {
      try {
        await handlerRef.current(data);
      } catch (error) {
        console.error(`Error in socket handler for "${event}":`, error);
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    socket.on(event, safeHandler);

    return () => {
      socket.off(event, safeHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, enabled, ...deps]);
}

/**
 * Hook for listening to multiple socket events
 */
export interface EventConfig<T = unknown> {
  event: string;
  handler: (data: T) => void | Promise<void>;
  enabled?: boolean;
}

export interface UseSafeSocketEventsOptions {
  socket: Socket | null;
  events: EventConfig[];
  onError?: (event: string, error: Error) => void;
}

/**
 * Hook for safely listening to multiple socket events
 *
 * @example
 * ```tsx
 * useSafeSocketEvents({
 *   socket,
 *   events: [
 *     { event: 'game-start', handler: handleGameStart },
 *     { event: 'game-end', handler: handleGameEnd },
 *     { event: 'score-update', handler: handleScoreUpdate, enabled: isPlaying },
 *   ],
 *   onError: (event, error) => {
 *     console.error(`Error in ${event}:`, error);
 *   }
 * });
 * ```
 */
export function useSafeSocketEvents({
  socket,
  events,
  onError,
}: UseSafeSocketEventsOptions): void {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Store latest handlers in refs so registered callbacks always call current version
  // (handlers are captured at registration time; this ref indirection prevents stale closures)
  const handlersRef = useRef<Array<(data: unknown) => void | Promise<void>>>([]);
  for (let i = 0; i < events.length; i++) {
    handlersRef.current[i] = events[i].handler;
  }
  handlersRef.current.length = events.length;

  // Build a stable config key to avoid JSON.stringify/map+join on every render
  const prevConfigKeyRef = useRef('');
  let configKey = '';
  for (let i = 0; i < events.length; i++) {
    if (i > 0) configKey += ',';
    configKey += events[i].event + ':' + (events[i].enabled ?? true);
  }
  prevConfigKeyRef.current = configKey;

  useEffect(() => {
    if (!socket) return;

    const registeredHandlers: Array<{ event: string; handler: (data: unknown) => void }> = [];

    events.forEach(({ event, enabled = true }, i) => {
      if (!enabled) return;

      const safeHandler = async (data: unknown) => {
        try {
          await handlersRef.current[i](data);
        } catch (error) {
          console.error(`Error in socket handler for "${event}":`, error);
          onErrorRef.current?.(event, error instanceof Error ? error : new Error(String(error)));
        }
      };

      socket.on(event, safeHandler);
      registeredHandlers.push({ event, handler: safeHandler });
    });

    return () => {
      for (const { event, handler } of registeredHandlers) {
        socket.off(event, handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, configKey]);
}

/**
 * Hook for emitting socket events with error handling
 */
export interface UseSocketEmitOptions {
  socket: Socket | null;
  onError?: (error: Error) => void;
}

export interface UseSocketEmitReturn {
  emit: <T = unknown>(event: string, data?: T) => void;
  emitWithAck: <T = unknown, R = unknown>(event: string, data?: T) => Promise<R | undefined>;
}

/**
 * Hook for safely emitting socket events
 *
 * @example
 * ```tsx
 * const { emit, emitWithAck } = useSocketEmit({ socket });
 *
 * // Fire and forget
 * emit('submit-word', { word: 'hello' });
 *
 * // With acknowledgment
 * const result = await emitWithAck('validate-word', { word: 'hello' });
 * ```
 */
export function useSocketEmit({
  socket,
  onError,
}: UseSocketEmitOptions): UseSocketEmitReturn {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (!socket) {
      console.warn(`Cannot emit "${event}": socket not connected`);
      return;
    }

    try {
      socket.emit(event, data);
    } catch (error) {
      console.error(`Error emitting "${event}":`, error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [socket]);

  const emitWithAck = useCallback(async <T = unknown, R = unknown>(
    event: string,
    data?: T
  ): Promise<R | undefined> => {
    if (!socket) {
      console.warn(`Cannot emit "${event}": socket not connected`);
      return undefined;
    }

    try {
      return await socket.emitWithAck(event, data) as R;
    } catch (error) {
      console.error(`Error emitting "${event}" with ack:`, error);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }, [socket]);

  return { emit, emitWithAck };
}

export default useSafeSocketEvent;
