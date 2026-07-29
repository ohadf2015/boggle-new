import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────

const mockGhostStart = vi.fn();
const mockGhostStop = vi.fn();
const mockGhostDestroy = vi.fn();
const mockMetaballDestroy = vi.fn();

vi.mock('custom-pixi-particles', () => {
  class MockGhostEffect {
    start = mockGhostStart;
    stop = mockGhostStop;
    destroy = mockGhostDestroy;
  }
  class MockMetaballPass {
    visible = false;
    destroy = mockMetaballDestroy;
  }
  return {
    GhostEffect: MockGhostEffect,
    MetaballPass: MockMetaballPass,
  };
});

vi.mock('pixi.js', () => {
  const mockTexture = { destroy: vi.fn() };

  class MockGraphics {
    circle() { return this; }
    fill() { return this; }
    destroy() {}
  }

  class MockSprite {
    anchor = { set: vi.fn() };
    x = 0;
    y = 0;
    visible = true;
    texture = mockTexture;
    destroy = vi.fn();
  }

  class MockContainer {
    addChild = vi.fn();
    removeChild = vi.fn();
  }

  return {
    Graphics: MockGraphics,
    Sprite: MockSprite,
    Container: MockContainer,
  };
});

import { useBlastAmbientEffects } from '../useBlastAmbientEffects';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeMockApp() {
  return {
    renderer: {
      generateTexture: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    },
  } as any;
}

function makeMockCamera() {
  return {
    addChild: vi.fn(),
    removeChild: vi.fn(),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('useBlastAmbientEffects', () => {
  let app: any;
  let camera: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeMockApp();
    camera = makeMockCamera();
  });

  it('returns moveGhostTo function', () => {
    const { result } = renderHook(() =>
      useBlastAmbientEffects({
        app, camera, width: 400, height: 400, cellSize: 50, chainLevel: 0,
      }),
    );
    expect(result.current.moveGhostTo).toBeTypeOf('function');
  });

  it('starts ghost effect when chainLevel >= 2', () => {
    renderHook(() =>
      useBlastAmbientEffects({
        app, camera, width: 400, height: 400, cellSize: 50, chainLevel: 2,
      }),
    );
    expect(mockGhostStart).toHaveBeenCalled();
  });

  it('stops ghost effect when chainLevel < 2', () => {
    renderHook(() =>
      useBlastAmbientEffects({
        app, camera, width: 400, height: 400, cellSize: 50, chainLevel: 0,
      }),
    );
    expect(mockGhostStop).toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      useBlastAmbientEffects({
        app, camera, width: 400, height: 400, cellSize: 50, chainLevel: 0,
      }),
    );
    unmount();
    expect(mockGhostStop).toHaveBeenCalled();
    expect(mockGhostDestroy).toHaveBeenCalled();
    expect(mockMetaballDestroy).toHaveBeenCalled();
  });
});
