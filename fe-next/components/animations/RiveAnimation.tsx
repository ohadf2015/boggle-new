'use client';

/**
 * RiveAnimation — wrapper around @rive-app/react-canvas.
 *
 * Designer authors an interactive scene with a State Machine. The game drives
 * the scene by passing typed inputs into the wrapper:
 *
 *   triggers={['drop']}                  fires the 'drop' trigger once on add
 *   booleanInputs={{ isSwinging: true }} mirrors React state into bool input
 *   numberInputs={{ height: 12 }}        mirrors React state into number input
 *
 * Inputs are bound via tiny per-name child components so the hook count stays
 * stable across renders. Reduced-motion + low-end devices skip the runtime
 * entirely and render the fallback.
 */

import { memo, useEffect, useMemo, useRef } from 'react';
import { useRive, useStateMachineInput, type Rive } from '@rive-app/react-canvas';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export interface RiveAnimationProps {
  /** Path to the .riv file (under /public). */
  src: string;
  /** State machine to drive. Required for triggers / booleanInputs. */
  stateMachineName?: string;
  /** Plain animation name (used only if no state machine). */
  animationName?: string;
  /** Autoplay the scene. */
  autoplay?: boolean;
  /** Size variant matching the neo-brutalist scale. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Extra className on the container. */
  className?: string;
  /** Fallback when Rive is loading / skipped on low-end / reduced-motion. */
  fallback?: React.ReactNode;
  /** Artboard name if the .riv has multiple. */
  artboardName?: string;
  /**
   * Trigger inputs to fire on the state machine. Each name in the array
   * fires once on mount — pass the same name again only after dropping it
   * from the array (i.e. use as a "pending triggers" queue).
   */
  triggers?: readonly string[];
  /** Boolean inputs mirrored into the state machine. */
  booleanInputs?: Record<string, boolean>;
  /** Number inputs mirrored into the state machine. */
  numberInputs?: Record<string, number>;
  /** Called once the rive instance is ready. */
  onLoad?: () => void;
}

const SIZE_MAP = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
  xl: 'w-64 h-64',
  full: 'w-full h-full',
} as const;

export const RiveAnimation = memo(function RiveAnimation({
  src,
  stateMachineName,
  animationName,
  autoplay = true,
  size = 'md',
  className,
  fallback = null,
  artboardName,
  triggers,
  booleanInputs,
  numberInputs,
  onLoad,
}: RiveAnimationProps) {
  const { isLowEnd, prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const skip = isLowEnd || prefersReducedMotion || !enableComplexAnimations;

  if (skip) return <>{fallback}</>;

  return (
    <div className={cn(SIZE_MAP[size], className)}>
      <RiveCanvas
        src={src}
        stateMachineName={stateMachineName}
        animationName={animationName}
        autoplay={autoplay}
        artboardName={artboardName}
        triggers={triggers}
        booleanInputs={booleanInputs}
        numberInputs={numberInputs}
        onLoad={onLoad}
      />
    </div>
  );
});

function RiveCanvas({
  src,
  stateMachineName,
  animationName,
  autoplay,
  artboardName,
  triggers,
  booleanInputs,
  numberInputs,
  onLoad,
}: Omit<RiveAnimationProps, 'size' | 'className' | 'fallback'>) {
  const riveOpts = useMemo(
    () => ({
      src,
      stateMachines: stateMachineName ? [stateMachineName] : undefined,
      animations: animationName ? [animationName] : undefined,
      autoplay,
      artboard: artboardName,
    }),
    [src, stateMachineName, animationName, autoplay, artboardName],
  );

  const { RiveComponent, rive } = useRive(riveOpts);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  useEffect(() => {
    if (rive && onLoadRef.current) onLoadRef.current();
  }, [rive]);

  return (
    <>
      <RiveComponent />
      {(triggers ?? []).map((name) => (
        <TriggerBind key={name} rive={rive} sm={stateMachineName} name={name} />
      ))}
      {booleanInputs &&
        Object.entries(booleanInputs).map(([n, v]) => (
          <BoolBind key={n} rive={rive} sm={stateMachineName} name={n} value={v} />
        ))}
      {numberInputs &&
        Object.entries(numberInputs).map(([n, v]) => (
          <NumBind key={n} rive={rive} sm={stateMachineName} name={n} value={v} />
        ))}
    </>
  );
}

function TriggerBind({ rive, sm, name }: { rive: Rive | null; sm: string | undefined; name: string }) {
  const input = useStateMachineInput(rive, sm, name);
  useEffect(() => {
    input?.fire?.();
  }, [input]);
  return null;
}

function BoolBind({
  rive, sm, name, value,
}: { rive: Rive | null; sm: string | undefined; name: string; value: boolean }) {
  const input = useStateMachineInput(rive, sm, name);
  useEffect(() => {
    // Rive SDK exposes `input.value` as a writable property — that's the only
    // way to drive the state machine, so we intentionally mutate the hook
    // return here (the standard react-hooks/immutability guard does not apply).
    // eslint-disable-next-line react-hooks/immutability
    if (input) input.value = value;
  }, [input, value]);
  return null;
}

function NumBind({
  rive, sm, name, value,
}: { rive: Rive | null; sm: string | undefined; name: string; value: number }) {
  const input = useStateMachineInput(rive, sm, name);
  useEffect(() => {
    // Rive SDK exposes `input.value` as a writable property — that's the only
    // way to drive the state machine, so we intentionally mutate the hook
    // return here (the standard react-hooks/immutability guard does not apply).
    // eslint-disable-next-line react-hooks/immutability
    if (input) input.value = value;
  }, [input, value]);
  return null;
}

export default RiveAnimation;
