import { useEffect, useRef } from 'react';

/**
 * Hook for declaratively adding event listeners
 *
 * Handles proper cleanup and keeps the handler reference stable
 * to avoid unnecessary re-subscriptions.
 *
 * @example
 * ```tsx
 * // Window event
 * useEventListener('scroll', handleScroll);
 * useEventListener('keydown', handleKeyDown, { passive: true });
 *
 * // Element event
 * useEventListener('click', handleClick, {}, buttonRef);
 *
 * // Conditionally enabled
 * useEventListener('mousemove', handleMouseMove, {}, undefined, isActive);
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  element?: React.RefObject<HTMLElement> | null,
  enabled?: boolean
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  element?: React.RefObject<Document> | null,
  enabled?: boolean
): void;

export function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLDivElement
>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  element?: React.RefObject<T> | null,
  enabled?: boolean
): void;

export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions,
  element?: React.RefObject<HTMLElement | Document | Window> | null,
  enabled: boolean = true
): void {
  // Keep handler reference stable
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // Skip if disabled
    if (!enabled) return;

    // Get target element (defaults to window)
    const targetElement = element?.current ?? window;

    if (!targetElement?.addEventListener) {
      return;
    }

    // Wrapper that calls the latest handler
    const eventListener = (event: Event) => {
      handlerRef.current(event);
    };

    targetElement.addEventListener(eventName, eventListener, options);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options, enabled]);
}

/**
 * Hook for listening to multiple events with the same handler
 *
 * @example
 * ```tsx
 * useEventListeners(
 *   ['mousedown', 'touchstart', 'keydown'],
 *   handleUserActivity
 * );
 * ```
 */
export function useEventListeners<K extends keyof WindowEventMap>(
  eventNames: K[],
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  element?: React.RefObject<HTMLElement> | null,
  enabled: boolean = true
): void {
  // Keep handler reference stable
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const targetElement = element?.current ?? window;

    if (!targetElement?.addEventListener) {
      return;
    }

    const eventListener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[K]);
    };

    eventNames.forEach(eventName => {
      targetElement.addEventListener(eventName, eventListener, options);
    });

    return () => {
      eventNames.forEach(eventName => {
        targetElement.removeEventListener(eventName, eventListener, options);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventNames.join(','), element, options, enabled]); // eventNames.join creates stable comparison for array
}

export default useEventListener;
