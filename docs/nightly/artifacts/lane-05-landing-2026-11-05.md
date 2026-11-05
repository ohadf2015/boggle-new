status: shipped
attempted: STEP 0 — improve one existing admin-beta mode (self-select, rotate away from last-3-nights target), one axis, smallest shippable slice.
files_touched:
- fe-next/lib/word-craft/celebration/gemDrama.ts
- fe-next/lib/word-craft/celebration/__tests__/gemDrama.test.ts
- fe-next/components/word-craft/gems/GemHuntPageClient.tsx
next_steps: Mode = Word Craft Gem Hunt (admin-gated, ?mode=gems), axis=feel. Gem transmute (chip->shard, shard->crown) now fires the same rarity-scaled celebration (sparkle/collect-chime or full celebration-burst/freeze-frame/achievement-sting) that a direct board pickup of that rarity already triggers, instead of one flat generic sound for every transmute. Added pure helper `dramaForTransmuteResult` in gemDrama.ts + 2 unit tests (7/7 total pass in that file). Eslint on the 3 touched files is clean. Not browser-verified — tomorrow's run (or the owner) should play it as admin and confirm the crown-transmute moment feels distinct, then reply thumbs up/down to the bot. No landing-CVR fallback was triggered (admin-beta rotation had signal every recent night); next landing-variant candidate stays parked per the "one per week" rule. Rotation note for next night: Wheel Rush and Word Craft Run were both touched more recently than Gem Hunt — avoid repeating Gem Hunt immediately, rotate to Wheel Rush or Run next.
