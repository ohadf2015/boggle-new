'use client';

// Blast-flavored backdrop for the MP results scene: neo-colored ember sparks
// drifting upward and fading, evoking the tile-detonation feel without stealing
// focus from the standings. Pure garnish — defensive by design:
//   • own file, imported with ssr:false by the parent
//   • inits ONLY once the host has a non-zero size, so the hidden (display:none)
//     desktop/mobile duplicate never spins up a second WebGL context
//   • destroys cleanly on unmount; never rendered when reduced-motion is on

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// lime · pink · cyan · yellow — the neo palette, as ember tints.
const COLORS = [0xbfff00, 0xff1493, 0x00ffff, 0xffe135];
const SPARK_COUNT = 42;

interface Spark {
  sprite: PIXI.Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
}

export default function BlastSparksCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let app: PIXI.Application | null = null;
    let destroyed = false;
    let dims = { w: 0, h: 0 };

    const reset = (s: Spark) => {
      s.sprite.x = Math.random() * dims.w;
      s.sprite.y = dims.h + Math.random() * 24;
      s.sprite.tint = COLORS[(Math.random() * COLORS.length) | 0];
      s.sprite.scale.set(0.35 + Math.random() * 0.85);
      s.sprite.alpha = 0;
      s.vx = (Math.random() - 0.5) * 14;
      s.vy = -(14 + Math.random() * 26);
      s.life = 0;
      s.max = 2.4 + Math.random() * 2.8;
      s.spin = (Math.random() - 0.5) * 1.4;
    };

    const init = async (w: number, h: number) => {
      if (destroyed || app) return;
      dims = { w, h };
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
        return; // WebGL unavailable — silently skip the garnish.
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

      // One small rounded-square texture, tinted per spark (neo "pixel" ember).
      const g = new PIXI.Graphics().roundRect(0, 0, 7, 7, 2).fill(0xffffff);
      const tex = application.renderer.generateTexture(g);
      g.destroy();

      const sparks: Spark[] = [];
      for (let i = 0; i < SPARK_COUNT; i++) {
        const sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(0.5);
        const spark: Spark = { sprite, vx: 0, vy: 0, life: 0, max: 1, spin: 0 };
        reset(spark);
        spark.life = Math.random() * spark.max; // desync the field
        application.stage.addChild(sprite);
        sparks.push(spark);
      }

      application.ticker.add((ticker) => {
        // Skip ambient spark updates after teardown (avoids touching destroyed
        // sprites) and while the tab is hidden (no point animating an unseen
        // canvas — this overlay otherwise runs 60fps for the whole session).
        if (destroyed) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        const dt = ticker.deltaMS / 1000;
        for (const s of sparks) {
          s.life += dt;
          if (s.life >= s.max) {
            reset(s);
            continue;
          }
          const p = s.life / s.max;
          s.sprite.x += s.vx * dt;
          s.sprite.y += s.vy * dt;
          s.sprite.rotation += s.spin * dt;
          // fade in over first 25%, hold, fade out over last 45%
          s.sprite.alpha = p < 0.25 ? p / 0.25 : p > 0.55 ? (1 - p) / 0.45 : 1;
        }
      });
    };

    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      if (!app) {
        void init(box.width, box.height);
      } else if (Math.abs(box.width - dims.w) > 2 || Math.abs(box.height - dims.h) > 2) {
        dims = { w: box.width, h: box.height };
        app.renderer.resize(box.width, box.height);
      }
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

  return <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0" />;
}
