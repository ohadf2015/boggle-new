import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { BlastLevel } from '@/lib/blast/v2/types';

const heLevel: BlastLevel = {
  id: 'test-he',
  levelNumber: 1,
  theme: 'onboarding',
  locale: 'he',
  words: ['שמש'],
  columns: [
    { index: 0, tiles: ['ש', 'מ'] },
    { index: 1, tiles: ['מ'] },
  ],
  resolvableOrder: ['שמש'],
  tileFlags: {},
  difficulty: 1,
};

describe('BlastBoard Hebrew final-form rendering', () => {
  it('renders base Hebrew letters on grid tiles, never final forms', () => {
    const { container } = render(
      <BlastBoard
        level={heLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={() => {}}
        onPointerEnter={() => {}}
        onPointerUp={() => {}}
        tileIds={[['t-0-0', 't-0-1'], ['t-1-0']]}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('ם');
    expect(text).not.toContain('ן');
    expect(text).not.toContain('ף');
    expect(text).not.toContain('ץ');
    expect(text).not.toContain('ך');
    expect(text).toContain('מ');
  });
});
