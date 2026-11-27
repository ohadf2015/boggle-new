import { describe, expect, it } from 'vitest';
import {
  NEO_BLOCK_TONES,
  NEO_BUTTON,
  NEO_DARK_EDGE,
  NEO_FOCUS,
  NEO_QUIET_FOCUS,
} from '@/components/ui/neoStyles';
import { mapClassString } from '../../../scripts/edu-sky-codemod.mjs';
import { EDU_BLOCK_TONES, EDU_BUTTON, EDU_DARK_EDGE, EDU_FOCUS, EDU_QUIET_FOCUS } from '../eduNeoStyles';

describe('classroom twins of the shared neo styles', () => {
  it('are exactly the sky codemod applied to the shared pieces', () => {
    expect(EDU_FOCUS).toBe(mapClassString(NEO_FOCUS));
    expect(EDU_QUIET_FOCUS).toBe(mapClassString(NEO_QUIET_FOCUS));
    expect(EDU_DARK_EDGE).toBe(mapClassString(NEO_DARK_EDGE));
    expect(EDU_BLOCK_TONES.purple).toBe('bg-neo-purple text-neo-black border-neo-black');
    for (const [tone, cls] of Object.entries(NEO_BLOCK_TONES).filter(([name]) => name !== 'purple')) {
      expect(EDU_BLOCK_TONES[tone as keyof typeof EDU_BLOCK_TONES], tone).toBe(mapClassString(cls));
    }
    for (const [variant, cls] of Object.entries(NEO_BUTTON)) {
      expect(EDU_BUTTON[variant as keyof typeof EDU_BUTTON], variant).toBe(mapClassString(cls));
    }
  });

  it('leave no navy or cream ink a sky page cannot show', () => {
    const all = [EDU_FOCUS, EDU_QUIET_FOCUS, EDU_DARK_EDGE, ...Object.values(EDU_BUTTON), EDU_BLOCK_TONES.navy].join(' ');
    expect(all).not.toMatch(/neo-navy|neo-cream/);
  });
});
