'use client';

import { useCallback, useState, type HTMLAttributes } from 'react';

type PressHandlers<E extends HTMLElement> = Pick<
  HTMLAttributes<E>,
  'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onPointerLeave' | 'onKeyDown' | 'onKeyUp' | 'onBlur'
>;

// JS press state because `:active` misses Enter and can stick or never fire on iOS.
export function usePress<E extends HTMLElement = HTMLElement>(
  handlers: PressHandlers<E> = {},
  disabled = false,
): PressHandlers<E> & { 'data-pressed'?: 'true' } {
  const [pressed, setPressed] = useState(false);
  const { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur } = handlers;

  const release = useCallback(() => setPressed(false), []);

  return {
    'data-pressed': pressed && !disabled ? 'true' : undefined,
    onPointerDown: (e) => {
      if (!disabled && e.button === 0) setPressed(true);
      onPointerDown?.(e);
    },
    onPointerUp: (e) => {
      release();
      onPointerUp?.(e);
    },
    onPointerCancel: (e) => {
      release();
      onPointerCancel?.(e);
    },
    onPointerLeave: (e) => {
      release();
      onPointerLeave?.(e);
    },
    onKeyDown: (e) => {
      if (!disabled && !e.repeat && (e.key === 'Enter' || e.key === ' ')) setPressed(true);
      onKeyDown?.(e);
    },
    onKeyUp: (e) => {
      if (e.key === 'Enter' || e.key === ' ') release();
      onKeyUp?.(e);
    },
    onBlur: (e) => {
      release();
      onBlur?.(e);
    },
  };
}
