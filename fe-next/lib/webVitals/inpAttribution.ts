/**
 * Compact INP attribution for `web_vitals.metadata`.
 *
 * `useReportWebVitals` (next/web-vitals) gives value + rating and nothing about
 * WHICH interaction was slow or WHY, which is why the es-vs-en INP gap (432ms
 * vs 216ms p75) could not be localised from field data at all. `web-vitals`
 * ships the attribution build separately; this trims its payload down to the
 * few fields worth storing on every row.
 *
 * Deliberately small: this is written on every INP report from every session, so
 * it keeps one script (the most expensive) rather than the whole LoAF tree.
 */

/** Shape of `INPMetricWithAttribution['attribution']`, minus what we discard. */
interface RawAttribution {
  interactionTarget?: string;
  interactionType?: string;
  inputDelay?: number;
  processingDuration?: number;
  presentationDelay?: number;
  loadState?: string;
  longAnimationFrameEntries?: Array<{
    blockingDuration?: number;
    scripts?: Array<{ sourceURL?: string; duration?: number; invoker?: string }>;
  }>;
}

export interface InpAttributionSummary {
  target?: string;
  type?: string;
  loadState?: string;
  /** The three phases INP decomposes into — they point at different fixes. */
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  blockingDuration: number;
  topScript?: string;
  topScriptMs?: number;
  topScriptInvoker?: string;
}

/** Origins differ per environment; the path is what groups across deploys. */
function stripOrigin(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function summarizeInpAttribution(
  attribution: RawAttribution | undefined,
): InpAttributionSummary | undefined {
  if (!attribution || Object.keys(attribution).length === 0) return undefined;

  const frames = attribution.longAnimationFrameEntries ?? [];
  const blockingDuration = frames.reduce((a, f) => a + (f.blockingDuration ?? 0), 0);

  let top: { sourceURL?: string; duration?: number; invoker?: string } | undefined;
  for (const frame of frames) {
    for (const script of frame.scripts ?? []) {
      if (!top || (script.duration ?? 0) > (top.duration ?? 0)) top = script;
    }
  }

  return {
    // Selectors can be enormous on deeply nested trees; a prefix still identifies it.
    target: attribution.interactionTarget?.slice(0, 120),
    type: attribution.interactionType,
    loadState: attribution.loadState,
    inputDelay: Math.round(attribution.inputDelay ?? 0),
    processingDuration: Math.round(attribution.processingDuration ?? 0),
    presentationDelay: Math.round(attribution.presentationDelay ?? 0),
    blockingDuration: Math.round(blockingDuration),
    topScript: top?.sourceURL ? stripOrigin(top.sourceURL) : undefined,
    topScriptMs: top?.duration === undefined ? undefined : Math.round(top.duration),
    topScriptInvoker: top?.invoker,
  };
}
