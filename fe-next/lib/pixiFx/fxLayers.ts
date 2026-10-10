// One effect drawn on the shared SharedFxApp canvas (fixed, fullscreen, z-9999)
// instead of its own Pixi Application, so the page keeps one WebGL context.
// Only for effects that already draw as a top-most viewport overlay.

import type { Application, Container } from 'pixi.js';
import { SharedFxApp } from './SharedFxApp';

export interface FxLayer {
  /** Called every frame. Return false when finished: the layer then detaches itself. */
  update(deltaMS: number): boolean;
  destroy?(): void;
}

export interface FxLayerContext {
  pixi: typeof import('pixi.js');
  app: Application;
  /** Viewport-sized, CSS-pixel coordinates. Destroyed with its children on detach. */
  container: Container;
}

/** Returns a synchronous detach, safe to call at any time and more than once. */
export function attachFxLayer(build: (ctx: FxLayerContext) => FxLayer): () => void {
  let done = false;
  let finish: ((deferRelease?: boolean) => void) | null = null;

  void (async () => {
    const app = await SharedFxApp.acquire();
    const pixi = app && !done ? await import('pixi.js') : null;
    if (!app || !pixi || done || SharedFxApp.getApplication() !== app) {
      SharedFxApp.release();
      return;
    }

    const container = new pixi.Container();
    app.stage.addChild(container);
    let layer: FxLayer | null = null;
    let removeWork: (() => void) | null = null;

    // Teardown of the shared app must not run inside its own ticker callback,
    // so a self-finished layer releases on the next microtask.
    finish = (deferRelease = false) => {
      finish = null;
      removeWork?.();
      try {
        layer?.destroy?.();
        container.destroy({ children: true });
      } catch {
        // decorative FX must never break the caller
      }
      if (deferRelease) queueMicrotask(SharedFxApp.release);
      else SharedFxApp.release();
    };

    try {
      layer = build({ pixi, app, container });
    } catch {
      finish();
      return;
    }
    if (done) {
      finish();
      return;
    }
    removeWork = SharedFxApp.addWork((deltaMS) => {
      if (layer!.update(deltaMS)) return true;
      done = true;
      finish?.(true);
      return false;
    });
  })();

  return () => {
    done = true;
    finish?.();
  };
}
