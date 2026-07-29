status: shipped
attempted: improve one existing admin-beta mode (STEP 0 default), one axis, existing files only
files_touched: fe-next/components/word-craft/gems/GemHuntWinScene.tsx
next_steps: eslint check on changed file was still running in background at end-of-lane (job be6t2iyfp) — verify clean before next lane touches this file; if red, revert the count-up tween (isolated to GemHuntWinSceneImpl useEffect + scoreRef).
