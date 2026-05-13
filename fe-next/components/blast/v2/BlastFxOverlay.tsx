'use client';
import { useEffect, useRef } from 'react';
import { classifyOvation, type OvationTier } from '@/lib/blast/v2/engine';
import styles from './BlastFxOverlay.module.css';

type Props = {
  chainEventKey?: number;
  chainDepth?: number;
  onChainOvation?: (tier: OvationTier) => void;
};

export function BlastFxOverlay({ chainEventKey, chainDepth, onChainOvation }: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastEventKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;

      // Pixi v8: zero-arg constructor + await init(). v7's `new Application(opts)`
      // silently skips plugin setup, then destroy() crashes calling `_cancelResize`.
      const app = new PIXI.Application();
      try {
        await app.init({
          canvas,
          backgroundAlpha: 0,
          antialias: true,
        });
      } catch {
        return;
      }

      if (cancelled) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // safe under fast unmount
        }
        return;
      }

      appInstance = app;
    })();

    return () => {
      cancelled = true;
      try {
        appInstance?.destroy(true, { children: true });
      } catch {
        // safe: app may not have finished init
      }
    };
  }, []);

  useEffect(() => {
    if (chainEventKey === undefined) return;
    if (chainEventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = chainEventKey;
    const tier = classifyOvation(chainDepth ?? 0);
    const canvas = canvasRef.current;
    if (tier !== 'none') {
      canvas?.setAttribute('data-ovation-tier', tier);
      onChainOvation?.(tier);
    } else {
      canvas?.removeAttribute('data-ovation-tier');
    }
  }, [chainEventKey, chainDepth, onChainOvation]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-fx"
      className={`${styles.canvas} absolute inset-0 pointer-events-none`}
      style={{ zIndex: 10 }}
    />
  );
}
