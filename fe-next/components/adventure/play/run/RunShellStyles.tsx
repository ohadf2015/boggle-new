'use client';

/**
 * Mounts the run screen's landscape / TV stylesheet (see `landscape.ts`).
 *
 * React 19 hoists a `<style href precedence>` into the head and de-duplicates it
 * by `href`, so mounting it next to the shell costs one tag no matter how many
 * times the level screen remounts — and it ships with the first paint, which is
 * the whole point: a JS-measured breakpoint would flash the phone layout on a TV.
 */
import { runShellCss } from './landscape';

export default function RunShellStyles() {
  return (
    <style href="adv-run-shell" precedence="default">
      {runShellCss()}
    </style>
  );
}
