// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { RiveAnimation } from '../RiveAnimation';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

vi.mock('@/hooks/useDevicePerformance');

const { fireTriggerSpy, setBoolSpy, onLoadCalls } = vi.hoisted(() => ({
  fireTriggerSpy: vi.fn(),
  setBoolSpy: vi.fn(),
  onLoadCalls: [] as Array<() => void>,
}));

vi.mock('@rive-app/react-canvas', () => {
  const triggerInput = { fire: fireTriggerSpy };
  let boolValue = false;
  const boolInput = {
    get value() { return boolValue; },
    set value(v: boolean) { boolValue = v; setBoolSpy(v); },
  };

  const Canvas = ({ onLoad }: { onLoad?: () => void }) => {
    useEffect(() => { if (onLoad) { onLoadCalls.push(onLoad); onLoad(); } }, [onLoad]);
    return <canvas data-testid="rive-canvas" />;
  };

  return {
    __esModule: true,
    default: Canvas,
    useRive: () => ({
      RiveComponent: Canvas,
      rive: { play: vi.fn(), stop: vi.fn() },
    }),
    useStateMachineInput: (_rive: unknown, _sm: string | undefined, name: string) => {
      if (name === 'drop' || name === 'topple' || name === 'landed') return triggerInput;
      if (name === 'isSwinging' || name === 'cosy') return boolInput;
      return null;
    },
  };
});

const mockPerf = useDevicePerformance as unknown as ReturnType<typeof vi.fn>;

describe('RiveAnimation wrapper', () => {
  beforeEach(() => {
    fireTriggerSpy.mockReset();
    setBoolSpy.mockReset();
    onLoadCalls.length = 0;
    mockPerf.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableComplexAnimations: true,
    });
  });

  it('renders fallback on low-end devices', () => {
    mockPerf.mockReturnValue({ isLowEnd: true, prefersReducedMotion: false, enableComplexAnimations: true });
    render(<RiveAnimation src="/rive/x.riv" fallback={<span data-testid="fb" />} />);
    expect(screen.getByTestId('fb')).toBeTruthy();
    expect(screen.queryByTestId('rive-canvas')).toBeNull();
  });

  it('renders fallback when user prefers reduced motion', () => {
    mockPerf.mockReturnValue({ isLowEnd: false, prefersReducedMotion: true, enableComplexAnimations: true });
    render(<RiveAnimation src="/rive/x.riv" fallback={<span data-testid="fb" />} />);
    expect(screen.getByTestId('fb')).toBeTruthy();
  });

  it('mounts the rive canvas when device is capable', async () => {
    render(<RiveAnimation src="/rive/x.riv" stateMachineName="Main" />);
    await act(async () => {});
    expect(await screen.findByTestId('rive-canvas')).toBeTruthy();
  });

  it('fires a state-machine trigger when triggers prop adds a name', async () => {
    const { rerender } = render(
      <RiveAnimation src="/rive/crane.riv" stateMachineName="Crane" triggers={[]} />,
    );
    await act(async () => {});
    rerender(<RiveAnimation src="/rive/crane.riv" stateMachineName="Crane" triggers={['drop']} />);
    await act(async () => {});
    expect(fireTriggerSpy).toHaveBeenCalledTimes(1);
  });

  it('sets boolean state-machine inputs from props', async () => {
    const { rerender } = render(
      <RiveAnimation src="/rive/crane.riv" stateMachineName="Crane" booleanInputs={{ isSwinging: false }} />,
    );
    await act(async () => {});
    rerender(
      <RiveAnimation src="/rive/crane.riv" stateMachineName="Crane" booleanInputs={{ isSwinging: true }} />,
    );
    await act(async () => {});
    expect(setBoolSpy).toHaveBeenLastCalledWith(true);
  });

  it('invokes onLoad once the rive instance is ready', async () => {
    const onLoad = vi.fn();
    render(<RiveAnimation src="/rive/x.riv" stateMachineName="Main" onLoad={onLoad} />);
    await act(async () => {});
    expect(onLoad).toHaveBeenCalled();
  });
});
