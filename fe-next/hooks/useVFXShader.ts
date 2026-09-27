'use client';

/**
 * useVFXShader — Singleton WebGL shader effects for DOM elements
 *
 * Wraps @vfx-js/core with React lifecycle management.
 * One VFX instance per page (WebGL context limit ~8-16).
 * Apply preset shaders like "rainbow", "glitch", "shine" to any element ref.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Lazy-import VFX to avoid SSR issues (WebGL needs DOM)
let vfxInstance: import('@vfx-js/core').VFX | null = null;
let vfxRefCount = 0;

type ShaderPreset =
  | 'rainbow'
  | 'glitch'
  | 'rgbShift'
  | 'shine'
  | 'pixelate'
  | 'halftone'
  | 'chromatic'
  | 'hueShift'
  | 'duotone'
  | 'sinewave';

interface VFXShaderOptions {
  /** Shader preset name */
  shader: ShaderPreset;
  /** Whether the effect is currently active */
  enabled?: boolean;
  /** Opacity of the effect overlay (0-1) */
  overflow?: number;
  /** Release transition duration in ms */
  releaseTransition?: number;
}

async function getVFXInstance() {
  if (vfxInstance) return vfxInstance;
  const { VFX } = await import('@vfx-js/core');
  vfxInstance = new VFX();
  return vfxInstance;
}

/**
 * Hook to apply WebGL shader effects to a DOM element.
 * Returns a ref callback to attach to the target element.
 *
 * Usage:
 * ```tsx
 * const { ref, applyEffect, removeEffect } = useVFXShader();
 * // Later: applyEffect('rainbow') or removeEffect()
 * ```
 */
export function useVFXShader() {
  const elementRef = useRef<HTMLElement | null>(null);
  const activeShader = useRef<ShaderPreset | null>(null);
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  // Track ref count for cleanup
  useEffect(() => {
    vfxRefCount++;
    return () => {
      vfxRefCount--;
      if (vfxRefCount <= 0 && vfxInstance) {
        vfxInstance.destroy();
        vfxInstance = null;
        vfxRefCount = 0;
      }
    };
  }, []);

  const applyEffect = useCallback(async (shader: ShaderPreset) => {
    if (prefersReducedMotion || isLowEnd) return;
    const el = elementRef.current;
    if (!el) return;

    // Remove existing effect first
    if (activeShader.current) {
      const vfx = await getVFXInstance();
      vfx.remove(el);
    }

    const vfx = await getVFXInstance();
    vfx.add(el, { shader });
    activeShader.current = shader;
  }, [prefersReducedMotion, isLowEnd]);

  const removeEffect = useCallback(async () => {
    const el = elementRef.current;
    if (!el || !activeShader.current) return;

    const vfx = await getVFXInstance();
    vfx.remove(el);
    activeShader.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const el = elementRef.current;
      if (el && activeShader.current && vfxInstance) {
        vfxInstance.remove(el);
      }
    };
  }, []);

  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  return { ref, applyEffect, removeEffect, elementRef };
}

/**
 * Map combo levels to shader effects for grid tiles.
 * Higher combos get more intense visual effects.
 */
export function getComboShader(comboLevel: number): ShaderPreset | null {
  if (comboLevel >= 8) return 'rainbow';
  if (comboLevel >= 6) return 'rgbShift';
  if (comboLevel >= 4) return 'shine';
  if (comboLevel >= 3) return 'hueShift';
  return null;
}

export type { ShaderPreset, VFXShaderOptions };
