'use client';

import { useRef, type ReactNode } from 'react';

const isActivationKey = (key: string) => key === 'Enter' || key === ' ';

/**
 * One delegated press handler for every `[data-press]` link inside it, so these server pages
 * get the chunky sink (`neoChunkyPress`) without hydrating a client wrapper per word chip.
 */
export function PressGroup({ className, children }: { className?: string; children: ReactNode }) {
  const pressed = useRef<Element | null>(null);

  const release = () => {
    pressed.current?.removeAttribute('data-pressed');
    pressed.current = null;
  };
  const press = (target: EventTarget) => {
    const el = target instanceof Element ? target.closest('[data-press]') : null;
    release();
    if (!el) return;
    el.setAttribute('data-pressed', 'true');
    pressed.current = el;
  };

  return (
    <div
      className={className}
      onPointerDown={(e) => e.button === 0 && press(e.target)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onPointerOut={(e) => {
        if (pressed.current && !pressed.current.contains(e.relatedTarget as Node | null)) release();
      }}
      onKeyDown={(e) => !e.repeat && isActivationKey(e.key) && press(e.target)}
      onKeyUp={(e) => isActivationKey(e.key) && release()}
      onBlur={release}
    >
      {children}
    </div>
  );
}
