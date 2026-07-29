import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastChainSoundListener } from '../BlastChainSoundListener';
import { BLAST_CHAIN_OVATION_EVENT, type ChainOvationDetail } from '../useChainEventBus';

const createOscillatorMock = vi.fn();
const createGainMock = vi.fn();
const closeMock = vi.fn();

class MockAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  createOscillator = createOscillatorMock;
  createGain = createGainMock;
  resume = vi.fn();
  close = closeMock;
}

beforeEach(() => {
  cleanup();
  createOscillatorMock.mockReset();
  createGainMock.mockReset();
  closeMock.mockReset();

  // Each oscillator returns a chainable connect-mock
  createOscillatorMock.mockImplementation(() => ({
    type: '',
    frequency: { value: 0 },
    connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGainMock.mockImplementation(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
  }));

  Object.defineProperty(window, 'AudioContext', {
    value: MockAudioContext,
    configurable: true,
    writable: true,
  });

  if (typeof localStorage !== 'undefined') localStorage.removeItem('sfx-muted');
});

function dispatchOvation(detail: ChainOvationDetail) {
  window.dispatchEvent(new CustomEvent(BLAST_CHAIN_OVATION_EVENT, { detail }));
}

describe('BlastChainSoundListener', () => {
  it('mounts and renders null (audio-only sentinel)', () => {
    const { container } = render(<BlastChainSoundListener />);
    expect(container.firstChild).toBeNull();
  });

  it('creates oscillator on small-tier event (1 note)', () => {
    render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'small', chainDepth: 2, chainEventKey: 1 });
    expect(createOscillatorMock).toHaveBeenCalledTimes(1);
  });

  it('creates 3 oscillators on big-tier event', () => {
    render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'big', chainDepth: 3, chainEventKey: 1 });
    expect(createOscillatorMock).toHaveBeenCalledTimes(3);
  });

  it('creates 5 oscillators on mega-tier event', () => {
    render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'mega', chainDepth: 6, chainEventKey: 1 });
    expect(createOscillatorMock).toHaveBeenCalledTimes(5);
  });

  it('skips audio when sfx-muted=true', () => {
    localStorage.setItem('sfx-muted', 'true');
    render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'mega', chainDepth: 6, chainEventKey: 1 });
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });

  it('skips when tier=none (defensive — bus already filters)', () => {
    render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'none', chainDepth: 0, chainEventKey: 1 });
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });

  it('closes AudioContext on unmount', () => {
    const { unmount } = render(<BlastChainSoundListener />);
    dispatchOvation({ tier: 'big', chainDepth: 3, chainEventKey: 1 });
    unmount();
    expect(closeMock).toHaveBeenCalled();
  });

  it('survives missing AudioContext (older browsers / SSR)', () => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true, writable: true });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined, configurable: true, writable: true });
    const { unmount } = render(<BlastChainSoundListener />);
    expect(() => dispatchOvation({ tier: 'big', chainDepth: 3, chainEventKey: 1 })).not.toThrow();
    expect(() => unmount()).not.toThrow();
  });
});
