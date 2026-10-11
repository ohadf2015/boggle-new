import React, { createRef } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import WheelDisc from '../WheelDisc';

function renderDisc(props: Partial<React.ComponentProps<typeof WheelDisc>> = {}) {
  const onPressedChange = vi.fn();
  render(
    <WheelDisc
      orbitRef={createRef<HTMLDivElement>()}
      centerLetter="N"
      outerLetters={['G', 'T', 'W', 'I', 'A', 'H']}
      builtIndices={[]}
      pointerPosRef={{ current: null }}
      draggingRef={{ current: false }}
      onPointerDown={vi.fn()}
      onPointerMove={vi.fn()}
      onPointerUp={vi.fn()}
      onPress={vi.fn()}
      onHoldStart={vi.fn()}
      onHoldEnd={vi.fn()}
      holdActiveIndex={null}
      fx={null}
      reducedMotion={false}
      onPressedChange={onPressedChange}
      {...props}
    />,
  );
  return { onPressedChange };
}

const letterBtn = (letter: string) =>
  document.querySelector<HTMLButtonElement>(`[data-wheel-letter="${letter}"]`)!;

describe('WheelDisc press reaction', () => {
  it('given a finger lands on an unused letter, then that letter lights up before any move and reports it', () => {
    const { onPressedChange } = renderDisc();
    fireEvent.pointerDown(letterBtn('T'));
    expect(letterBtn('T').dataset.wheelPressed).toBe('true');
    expect(letterBtn('T').dataset.wheelUsed).toBe('false');
    expect(letterBtn('G').dataset.wheelPressed).toBe('false');
    expect(onPressedChange).toHaveBeenLastCalledWith('T');
  });

  it('given the finger lifts off the disc, then the press clears', () => {
    const { onPressedChange } = renderDisc();
    fireEvent.pointerDown(letterBtn('N'));
    expect(letterBtn('N').dataset.wheelPressed).toBe('true');
    fireEvent.pointerUp(screen.getByTestId('wheel-orbit'));
    expect(letterBtn('N').dataset.wheelPressed).toBe('false');
    expect(onPressedChange).toHaveBeenLastCalledWith(null);
  });

  it('given a letter already in the word, then pressing it does not read as a fresh pick', () => {
    const { onPressedChange } = renderDisc({ builtIndices: [1] });
    fireEvent.pointerDown(letterBtn('T'));
    expect(letterBtn('T').dataset.wheelPressed).toBe('false');
    expect(onPressedChange).not.toHaveBeenCalledWith('T');
  });

  it('still hands the press to the hold-to-submit handler', () => {
    const onHoldStart = vi.fn();
    renderDisc({ onHoldStart });
    fireEvent.pointerDown(letterBtn('A'));
    expect(onHoldStart).toHaveBeenCalledWith('A', 4, letterBtn('A'));
  });
});
