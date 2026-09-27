/**
 * useAvatarGlowUp — client hook to request an AI hero portrait of the built avatar.
 *
 * Serializes the rendered avatar SVG and POSTs it to the admin-only glow-up route
 * (cookie session auth). Returns the resulting portrait URL + request state.
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

import { useCallback, useState } from 'react';
import { serializeAvatarSvg } from '@/lib/avatar/rasterizeAvatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface UseAvatarGlowUp {
  generate: (svgEl: SVGSVGElement, config: CustomAvatarConfig) => Promise<void>;
  loading: boolean;
  resultUrl: string | null;
  error: string | null;
  reset: () => void;
}

export function useAvatarGlowUp(): UseAvatarGlowUp {
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResultUrl(null);
    setError(null);
    setLoading(false);
  }, []);

  const generate = useCallback(async (svgEl: SVGSVGElement, config: CustomAvatarConfig) => {
    setLoading(true);
    setError(null);
    setResultUrl(null);
    try {
      const svgString = serializeAvatarSvg(svgEl);
      const res = await fetch('/api/avatar/glow-up', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svgString, config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setResultUrl(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Glow-up failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, resultUrl, error, reset };
}
