'use client';

// One-shot victory spark burst for the results RivalsPanel — fired once when the
// player finished ahead of their closest rival. Neo-colored shards launch up-and-
// out from the panel's lower edge, arc under gravity, and fade. Pure garnish,
// defensive by design (mirrors BlastSparksCanvas):
//   • own file, imported with ssr:false by the parent
//   • inits ONLY once the host reports a non-zero size
//   • try/catch around WebGL init; silently skips if unavailable
//   • self-destroys after the burst settles; clean teardown on unmount
//   • parent never mounts it under prefers-reduced-motion

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// lime · pink · cyan · yellow — neo palette as confetti shards.
const COLORS = [0xbfff00, 0xff1493, 0x00ffff, 0xffe135];
const SHARD_COUNT = 36;
const GRAVITY = 520; // px/s²
const LIFETIME = 1.5; // s — burst fully faded by here

interface Shard {
  sprite: PIXI.Sprite;
  vx: number;
  vy: number;
  life: number;
  spin: number;
}

export default function RivalVictorySparks() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let app: PIXI.Application | null = null;
    let destroyed = false;

    const init = async (w: number, h: number) => {
      if (destroyed || app) return;
      const application = new PIXI.Application();
      try {
        await application.init({
          width: w,
          height: h,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });
      } catch {
        return; // WebGL unavailable — skip the garnish.
      }
      if (destroyed) {
        application.destroy(true, { children: true });
        return;
      }
      app = application;
      const canvas = application.canvas;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      host.appendChild(canvas);

      // Small rounded-square shard texture, tinted per shard.
      const g = new PIXI.Graphics().roundRect(0, 0, 8, 8, 2).fill(0xffffff);
      const tex = application.renderer.generateTexture(g);
      g.destroy();

      const originX = w / 2;
      const originY = h * 0.78;
      const shards: Shard[] = [];
      for (let i = 0; i < SHARD_COUNT; i++) {
        const sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.x = originX;
        sprite.y = originY;
        sprite.tint = COLORS[(Math.random() * COLORS.length) | 0];
        sprite.scale.set(0.5 + Math.random() * 0.9);
        // Launch in an upward fan: angle from -150° to -30°.
        const angle = (-150 + Math.random() * 120) * (Math.PI / 180);
        const speed = 180 + Math.random() * 260;
        application.stage.addChild(sprite);
        shards.push({
          sprite,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          spin: (Math.random() - 0.5) * 8,
        });
      }

      application.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        let allDone = true;
        for (const s of shards) {
          s.life += dt;
          if (s.life >= LIFETIME) {
            s.sprite.alpha = 0;
            continue;
          }
          allDone = false;
          s.vy += GRAVITY * dt;
          s.sprite.x += s.vx * dt;
          s.sprite.y += s.vy * dt;
          s.sprite.rotation += s.spin * dt;
          const p = s.life / LIFETIME;
          // fade in fast (first 12%), then ease out over the tail.
          s.sprite.alpha = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
        }
        if (allDone && app) {
          app.destroy(true, { children: true });
          app = null;
        }
      });
    };

    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      if (!app) void init(box.width, box.height);
    });
    ro.observe(host);

    return () => {
      destroyed = true;
      ro.disconnect();
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />;
}
