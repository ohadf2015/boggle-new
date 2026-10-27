status: shipped
attempted: STEP 0 mode improvement — understandability axis for Wheel Rush (admin-gated MP mode)
files_touched:
- fe-next/components/multiplayer/WheelRushView.tsx (+import ModeCoach, mount `<ModeCoach mode="wheelRush" />`)
notes: >
  Rotation: Wheel Rush not shipped-to in last run (last mode ships were 10-23 Word Craft, 10-21 Wheel Rush,
  no mode improvement on 10-24/25/26). Found: lib/tutorial/modeCoachContent.ts already has a full
  `wheelRush` coach entry (title/step1/step2/scoreTip) and all 5 locale translation files
  (en/he/sv/ja/es) already have the matching modeCoach.wheelRush.* strings — fully authored, zero
  i18n work needed — but WheelRushView.tsx never rendered `<ModeCoach>` at all. First-time players got
  zero rule explanation (existing `MPDragCoachmark` only teaches the drag gesture after 20s idle, not
  the goal). Wired the existing, already-tested, already-translated component — 2-line diff, no new
  strings, no new flag, no gameplay/scoring logic touched, admin gate on the mode untouched.
next_steps: eslint run on changed file still finishing in background at cutoff — verify output, and spot-check Hebrew RTL render of the coach card on wheelRush (reuses shared ModeCoach UI already live on wordCraft/blast/etc, so risk is low).
