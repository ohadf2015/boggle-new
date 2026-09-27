import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WreckUpdate } from '../WreckCanvas';

// Pixi cannot render in jsdom; the canvas is driven through its props contract.
let push: (u: WreckUpdate) => void = () => {};
const cut = vi.fn();
vi.mock('../WreckCanvas', () => ({
  default: (p: { registerCut: (c: () => void) => void; onUpdate: (u: WreckUpdate) => void }) => {
    p.registerCut(cut);
    push = p.onUpdate;
    return <div data-testid="wreck-canvas" />;
  },
}));

import { WreckScene } from '../WreckScene';

const t = (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key);
const base = { wrecked: 0, total: 8, ballsLeft: 2, armed: true, done: false, hits: 0 };

async function setup() {
  const onShare = vi.fn();
  const onClose = vi.fn();
  render(<WreckScene t={t} title="Dana's tower" words={['a', 'b']} balls={3} reducedMotion onShare={onShare} onClose={onClose} />);
  // next/dynamic resolves the canvas asynchronously; drive it only once mounted.
  await screen.findByTestId('wreck-canvas');
  return { onShare, onClose };
}

describe('WreckScene', () => {
  it('given an armed ball, when the player taps, then the chain is cut', async () => {
    await setup();
    act(() => push(base));
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.cut' }));
    expect(cut).toHaveBeenCalled();
  });

  it('given the rival, when shown, then their name titles the scene', async () => {
    await setup();
    expect(screen.getByText("Dana's tower")).toBeInTheDocument();
  });

  it('given the last ball settled, when done, then the result and share appear', async () => {
    const { onShare, onClose } = await setup();
    act(() => push({ ...base, wrecked: 6, ballsLeft: 0, armed: false, done: true }));
    expect(screen.getByText('wordTowerV2.wreck.result:{"n":6,"total":8}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.share' }));
    expect(onShare).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.back' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('given a heavy hit, when reported, then a CRASH pops', async () => {
    await setup();
    act(() => push({ ...base, hits: 3 }));
    expect(screen.getByText('wordTowerV2.wreck.crash')).toBeInTheDocument();
  });
});

describe('WreckScene exits', () => {
  it('given a round in progress, when Escape or close is pressed, then it closes', async () => {
    const { onClose } = await setup();
    act(() => push(base));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.back' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
