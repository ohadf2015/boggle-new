'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/utils/platform';

/**
 * TEMPORARY admin-only diagnostic. Renders ONLY on native (Capacitor) for admins.
 * Reports what occupies the mid-screen "blank panel" region so we can identify
 * the element painting over the home content. Remove once the blank is fixed.
 */
export function NativeDomProbe(): React.ReactElement | null {
  const { isAdmin } = useAuth();
  const [report, setReport] = useState('probing…');

  useEffect(() => {
    if (!isNative() || !isAdmin) return;
    const sample = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const lines: string[] = [`vp ${W}x${H} native`];

      // 1) Any <canvas> in DOM (the FX layer)? Report rect + key styles.
      const canvases = Array.from(document.querySelectorAll('canvas'));
      lines.push(`canvas count=${canvases.length}`);
      canvases.slice(0, 3).forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        lines.push(
          `cv${i}: ${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.top)} pos=${cs.position} z=${cs.zIndex} pe=${cs.pointerEvents} op=${cs.opacity}`
        );
      });

      // 2) What is topmost at mid-blank points (elementFromPoint skips pe:none).
      [0.55, 0.7].forEach((f) => {
        const el = document.elementFromPoint(Math.round(W / 2), Math.round(H * f)) as HTMLElement | null;
        if (!el) {
          lines.push(`@${f}: null`);
          return;
        }
        const cs = getComputedStyle(el);
        const id = el.id ? `#${el.id}` : '';
        const cls = (el.className || '').toString().split(/\s+/).slice(0, 2).join('.');
        lines.push(`@${f}: ${el.tagName}${id}.${cls} bg=${cs.backgroundColor} z=${cs.zIndex}`);
      });

      // 3) Body / html background + scroll height (is content there but hidden?).
      lines.push(`docH=${document.documentElement.scrollHeight} bodyH=${document.body.scrollHeight}`);
      const hb = getComputedStyle(document.documentElement).backgroundColor;
      lines.push(`html.bg=${hb}`);

      setReport(lines.join('\n'));
    };
    sample();
    const id = window.setInterval(sample, 1500);
    return () => window.clearInterval(id);
  }, [isAdmin]);

  if (!isNative() || !isAdmin) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 70,
        left: 8,
        right: 8,
        zIndex: 2147483647,
        background: 'rgba(0,0,0,0.85)',
        color: '#bfff00',
        font: '11px/1.35 monospace',
        padding: '8px 10px',
        borderRadius: 8,
        border: '2px solid #bfff00',
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
      }}
    >
      {report}
    </div>
  );
}

export default NativeDomProbe;
