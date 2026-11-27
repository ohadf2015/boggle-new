'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { Application } from 'pixi.js';
import { keepRafLoopAlive, restartPixiTicker } from '@/lib/native/foregroundResume';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { TweenManager } from '@/lib/gameEngine/Tween';
import { createFixedStep } from '@/lib/holidays/arcade/kit/fixedStep';
import type { PointerSample } from '@/lib/holidays/arcade/kit/gesture';
import { cn } from '@/lib/utils';
import { ART_H, ART_W, artUrl, type FloatTone, type KitCtx, type Scene } from './types';
import type { KitSfx } from './useKitSfx';
import styles from './kit.module.css';

interface Props {
  art: string[];
  create: (ctx: KitCtx) => Scene;
  paused: boolean;
  reduced: boolean;
  sfx: KitSfx;
  label: string;
  focus?: { x: number; y: number };
  className?: string;
}

const TONE: Record<FloatTone, string> = {
  gold: 'text-neo-holiday-gold',
  good: 'text-neo-lime',
  bad: 'text-neo-pink',
};

const HIT_STOP_RATE = 0.12;

export default function PixiStage({ className, label, ...props }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const floatsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    const floats = floatsRef.current;
    if (!host || !floats) return;
    let disposed = false;
    let app: Application | null = null;
    const offs: (() => void)[] = [];
    const keepAlive = keepRafLoopAlive(() => restartPixiTicker(app));

    void (async () => {
      const pixi = await import('pixi.js');
      const created = new pixi.Application();
      await created.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: host,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (disposed) {
        created.destroy({ removeView: true });
        return;
      }
      app = created;
      host.prepend(created.canvas);
      await pixi.Assets.load(propsRef.current.art.map(artUrl)).catch(() => undefined);
      const { ParticlePool } = await import('@/lib/gameEngine/ParticleSystem');
      if (disposed) return;

      const { reduced, focus = { x: 0.5, y: 0.5 } } = propsRef.current;
      const world = new pixi.Container();
      world.sortableChildren = true;
      const fx = new pixi.Container();
      fx.zIndex = 1000;
      world.addChild(fx);
      created.stage.addChild(world);
      const particles = new ParticlePool(fx);
      const shaker = new ScreenShake();
      const tweens = new TweenManager();
      const view = { scale: 1, x: 0, y: 0 };
      let stopMs = 0;

      const layout = () => {
        const { width: w, height: h } = created.screen;
        view.scale = Math.max(w / ART_W, h / ART_H);
        view.x = (w - ART_W * view.scale) * focus.x;
        view.y = (h - ART_H * view.scale) * focus.y;
        world.scale.set(view.scale);
        world.position.set(view.x, view.y);
      };
      layout();
      created.renderer.on('resize', layout);
      offs.push(() => created.renderer.off('resize', layout));

      const float = (x: number, y: number, text: string, tone: FloatTone = 'gold') => {
        const span = document.createElement('span');
        span.className = cn(styles.float, TONE[tone], 'font-neo-display text-2xl font-black [text-shadow:2px_2px_0_rgb(var(--neo-black)),-1px_-1px_0_rgb(var(--neo-black))]');
        span.textContent = text;
        span.style.left = `${view.x + x * view.scale}px`;
        span.style.top = `${view.y + y * view.scale}px`;
        span.addEventListener('animationend', () => span.remove(), { once: true });
        floats.appendChild(span);
        window.setTimeout(() => span.remove(), 1400);
      };

      const ctx: KitCtx = {
        pixi,
        app: created,
        world,
        fx,
        reduced,
        tex: (name) => pixi.Assets.get(artUrl(name)) ?? pixi.Texture.WHITE,
        tweens,
        shake: (intensity, seconds = 0.3) => {
          if (!reduced) shaker.shake({ intensity, duration: seconds, decay: 'exponential' });
        },
        hitStop: (ms) => {
          if (!reduced) stopMs = Math.max(stopMs, ms);
        },
        burst: (preset, x, y, count) => {
          if (!reduced) particles.burst(preset, x, y, count);
        },
        float,
        sfx: propsRef.current.sfx,
      };
      const scene = propsRef.current.create(ctx);
      sceneRef.current = scene;

      const loop = createFixedStep((dt) => {
        scene.update(dt);
        tweens.update(dt);
        particles.update(dt);
      });
      created.ticker.add((ticker) => {
        keepAlive.beat();
        const frame = Math.min(ticker.deltaMS, 100);
        shaker.update(frame / 1000);
        world.position.set(view.x + shaker.offset.x, view.y + shaker.offset.y);
        if (propsRef.current.paused || document.hidden) return;
        const scale = stopMs > 0 ? HIT_STOP_RATE : 1;
        stopMs = Math.max(0, stopMs - frame);
        loop.advance(frame, scale);
      });

      const toWorld = (e: PointerEvent): PointerSample => {
        const r = host.getBoundingClientRect();
        return { x: (e.clientX - r.left - view.x) / view.scale, y: (e.clientY - r.top - view.y) / view.scale, t: performance.now() };
      };
      const on = (type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', fn: (p: PointerSample) => void) => {
        const h = (e: PointerEvent) => {
          if (propsRef.current.paused) return;
          if (type === 'pointerdown') host.setPointerCapture?.(e.pointerId);
          fn(toWorld(e));
        };
        host.addEventListener(type, h);
        offs.push(() => host.removeEventListener(type, h));
      };
      on('pointerdown', (p) => scene.pointerDown?.(p));
      on('pointermove', (p) => scene.pointerMove?.(p));
      on('pointerup', (p) => scene.pointerUp?.(p));
      on('pointercancel', (p) => scene.pointerUp?.(p));
    })();

    return () => {
      disposed = true;
      keepAlive.stop();
      offs.forEach((off) => off());
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
      app?.destroy({ removeView: true }, { children: true });
      floats.replaceChildren();
    };
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!propsRef.current.paused) sceneRef.current?.action?.();
  };

  return (
    <div ref={hostRef} tabIndex={0} role="application" aria-label={label} onKeyDown={onKey} className={cn(styles.stage, className)}>
      <div ref={floatsRef} className={styles.floats} aria-hidden="true" />
    </div>
  );
}
