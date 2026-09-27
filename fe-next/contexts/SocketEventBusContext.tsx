/**
 * SocketEventBusContext - Event bus pattern for socket events
 *
 * This context provides a centralized event bus for socket events, eliminating
 * the need to pass event handler callbacks as props through multiple layers.
 *
 * Architecture Pattern: Pub/Sub (Observer pattern)
 *
 * Usage:
 * 1. Wrap your app with <SocketEventBusProvider>
 * 2. Subscribe to events via useSocketEvent() hook
 * 3. Emit events from socket handlers
 *
 * Benefits:
 * - Decouples socket event handling from component hierarchy
 * - No prop drilling for callbacks
 * - Type-safe event subscriptions
 * - Automatic cleanup of subscriptions
 */

'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import logger from '@/utils/logger';

// ==========================================
// Event Emitter Implementation
// ==========================================

type EventHandler<T = any> = (data: T) => void;
type UnsubscribeFn = () => void;

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event
   * @param eventName - Name of the event to listen for
   * @param handler - Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<T = any>(eventName: string, handler: EventHandler<T>): UnsubscribeFn {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Unsubscribe from an event
   * @param eventName - Name of the event
   * @param handler - Handler to remove
   */
  off<T = any>(eventName: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param eventName - Name of the event
   * @param data - Data to pass to handlers
   */
  emit<T = any>(eventName: string, data: T): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in event handler for "${eventName}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event (or all events if no name provided)
   * @param eventName - Optional event name
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get count of listeners for an event
   * @param eventName - Event name
   * @returns Number of listeners
   */
  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size || 0;
  }
}

// ==========================================
// Context Definition
// ==========================================

interface SocketEventBusContextValue {
  /**
   * Event bus instance for subscribing/emitting events
   */
  eventBus: EventBus;

  /**
   * Emit an event to all subscribers
   */
  emit: <T = any>(eventName: string, data: T) => void;

  /**
   * Subscribe to an event (use useSocketEvent hook instead for auto-cleanup)
   */
  on: <T = any>(eventName: string, handler: EventHandler<T>) => UnsubscribeFn;
}

const SocketEventBusContext = createContext<SocketEventBusContextValue | null>(null);

// ==========================================
// Provider Component
// ==========================================

interface SocketEventBusProviderProps {
  children: ReactNode;
}

export function SocketEventBusProvider({ children }: SocketEventBusProviderProps) {
  // Create event bus instance once (persists across re-renders)
  const eventBusRef = useRef<EventBus | null>(null);

  if (!eventBusRef.current) {
    eventBusRef.current = new EventBus();
  }

  const emit = useCallback(<T = any>(eventName: string, data: T) => {
    eventBusRef.current!.emit(eventName, data);
  }, []);

  const on = useCallback(<T = any>(eventName: string, handler: EventHandler<T>) => {
    return eventBusRef.current!.on(eventName, handler);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo<SocketEventBusContextValue>(() => ({
    eventBus: eventBusRef.current!,
    emit,
    on,
  }), [emit, on]);

  return (
    <SocketEventBusContext.Provider value={value}>
      {children}
    </SocketEventBusContext.Provider>
  );
}

// ==========================================
// Custom Hook to Consume Context
// ==========================================

/**
 * Access the socket event bus
 *
 * @throws Error if used outside of SocketEventBusProvider
 * @returns Event bus methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { emit } = useSocketEventBus();
 *
 *   // Emit an event
 *   emit('gameStarted', { gameCode: 'ABC123' });
 * }
 * ```
 */
export function useSocketEventBus(): SocketEventBusContextValue {
  const context = useContext(SocketEventBusContext);

  if (!context) {
    throw new Error(
      'useSocketEventBus must be used within a SocketEventBusProvider. ' +
      'Make sure your component is wrapped in <SocketEventBusProvider>.'
    );
  }

  return context;
}

// ==========================================
// Custom Hook for Event Subscriptions
// ==========================================

/**
 * Subscribe to a socket event with automatic cleanup
 *
 * This hook automatically unsubscribes when the component unmounts
 * or when dependencies change.
 *
 * @param eventName - Name of the event to listen for
 * @param handler - Function to call when event is emitted
 * @param deps - Dependency array (like useEffect)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const username = useUsername(); // from @/hooks/gameState/store
 *
 *   useSocketEvent('wordAccepted', (data) => {
 *     console.log('Word accepted:', data.word);
 *     // Handle word accepted event
 *   }, [username]);
 *
 *   return <div>Game Component</div>;
 * }
 * ```
 */
export function useSocketEvent<T = any>(
  eventName: string,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
): void {
  const { on } = useSocketEventBus();

  useEffect(() => {
    const unsubscribe = on<T>(eventName, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, on, ...deps]);
}

// ==========================================
// Exports
// ==========================================

export { SocketEventBusContext };
export type { EventHandler, UnsubscribeFn, SocketEventBusContextValue };
