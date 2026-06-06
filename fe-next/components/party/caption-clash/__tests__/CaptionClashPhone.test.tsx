import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import CaptionClashPhone from '../CaptionClashPhone';

/**
 * Integration: the caption phone controller's submit safety.
 *  - The Submit button must be truly `disabled` (not just aria-disabled) when
 *    empty, so an empty caption never reaches the backend.
 *  - A rapid double-tap must emit exactly one caption (useSubmitGuard, F4).
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));
vi.mock('@/hooks/usePartySounds', () => ({
  usePartySounds: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('worker-timers', () => ({
  setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
  clearInterval: (id: number) => globalThis.clearInterval(id),
}));

function makeSocket() {
  const handlers: Record<string, (data?: unknown) => void> = {};
  return {
    on: (event: string, cb: (data?: unknown) => void) => { handlers[event] = cb; },
    off: (event: string) => { delete handlers[event]; },
    emit: vi.fn(),
    fire: (event: string, data?: unknown) => act(() => handlers[event]?.(data)),
  };
}

const imageReady = {
  imageUrl: '', imageId: 'i1', round: 1, totalRounds: 7,
  isSpeedRound: false, isRoastRound: false, writeTimeSeconds: 45,
};

function setup() {
  const onSendInput = vi.fn();
  const socket = makeSocket();
  render(
    <CaptionClashPhone socket={socket as never} playerId="p1" isSpectator={false} onSendInput={onSendInput} />
  );
  socket.fire('party:caption:imageReady', imageReady);
  return { onSendInput, socket };
}

describe('CaptionClashPhone — submit safety', () => {
  it('keeps the Submit button disabled while the caption is empty', () => {
    setup();
    const submit = screen.getByText('party.submit').closest('button')!;
    expect(submit).toBeDisabled();
  });

  it('enables Submit once text is entered and emits exactly one caption on double-tap', () => {
    const { onSendInput } = setup();
    const textarea = screen.getByPlaceholderText('party.writeCaptionPlaceholder');
    act(() => { fireEvent.change(textarea, { target: { value: 'lol nice' } }); });

    const submit = screen.getByText('party.submit').closest('button')!;
    expect(submit).not.toBeDisabled();

    act(() => { submit.click(); submit.click(); });

    const captionEmits = onSendInput.mock.calls.filter(([c]) => c.action === 'submit-caption');
    expect(captionEmits).toHaveLength(1);
    expect(captionEmits[0][0].text).toBe('lol nice');
  });
});
