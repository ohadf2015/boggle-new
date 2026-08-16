status: shipped
attempted: STEP 0 — improve one existing admin-beta mode (self-select target, rotate off recently-touched modes), one axis, existing files only.
files_touched:
- fe-next/components/connections/ConnectionsDailyChallenge.tsx
- fe-next/translations/en.js
- fe-next/translations/he.js
- fe-next/translations/sv.js
- fe-next/translations/ja.js
- fe-next/translations/es.js
next_steps: Connections Daily (admin-gated) now shows a live pop-animated score in the header during play, not just on the results screen — a variable-reward visibility fix. Rotation note for tomorrow's lane 5: sealed-bid, word-craft, brain-drill were the last-improved modes; connections/pyramid/word-tower-daily were not — keep rotating away from sealed-bid/word-craft/brain-drill for a few more nights. Pre-existing unrelated issue noticed but NOT fixed (out of scope): `copied` state in ConnectionsDailyChallenge.tsx is set via setCopied(true) on share-copy but never rendered as a "Copied!" toast — small follow-up for a future understandability pass.
