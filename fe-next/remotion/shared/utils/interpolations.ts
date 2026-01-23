import { interpolate } from 'remotion';

/**
 * Interpolate opacity from 0 to 1 for fade-in effect.
 * @param frame Current frame number
 * @param startFrame Frame to begin fade-in
 * @param duration Duration in frames
 * @returns Opacity value between 0 and 1
 */
export function fadeIn(
  frame: number,
  startFrame: number,
  duration: number
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });
}

/**
 * Interpolate opacity from 1 to 0 for fade-out effect.
 * @param frame Current frame number
 * @param startFrame Frame to begin fade-out
 * @param duration Duration in frames
 * @returns Opacity value between 0 and 1
 */
export function fadeOut(
  frame: number,
  startFrame: number,
  duration: number
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });
}

/**
 * Ken Burns zoom effect - smooth scale transition.
 * @param frame Current frame number
 * @param startFrame Frame to begin zoom
 * @param duration Duration in frames
 * @param startScale Initial scale (e.g., 1.15 for slight zoom-in)
 * @param endScale Final scale (e.g., 1.0 for natural size)
 * @returns Scale value for CSS transform
 */
export function kenBurnsZoom(
  frame: number,
  startFrame: number,
  duration: number,
  startScale: number,
  endScale: number
): number {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [startScale, endScale],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );
}
