status: shipped
files_touched:
- fe-next/components/multiplayer/WheelRushCelebration.tsx
- fe-next/components/multiplayer/__tests__/WheelRushCelebration.test.tsx
- fe-next/translations/en.js
- fe-next/translations/he.js
- fe-next/translations/sv.js
- fe-next/translations/ja.js
- fe-next/translations/es.js
- fe-next/translations/ru.js
next_steps: Wheel Rush now escalates the streak badge to an on-fire (neo-orange, Flame icon) tier at streak>=4, vs the flat neo-black/yellow badge at all counts before. Variable-reward axis. Rotation: last 3 modes shipped were Memory Hunt / Connections / Memory Hunt, so Wheel Rush was picked to spread coverage. Admin gate untouched (mode selection gate lives outside this component). Tomorrow: consider the same escalation pattern for sealed-bid or brain-drill reward moments if they still use flat single-tier badges.
