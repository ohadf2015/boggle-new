status: shipped
files_touched:
  - fe-next/components/party/caption-clash/CaptionClashTv.tsx
attempted: polish party game TV views per founder directive — make them look and feel good
changes:
  - voting phase: was "Vote on your phone!" placeholder → dramatic fullscreen countdown with pulse ring, huge timer, urgency color shift (pink→red at 5s), progress bar, phone icons
  - crown phase: was minimal winner card → bar chart with animated fill, winner spotlight with neo-pink border glow, confetti corner emojis, quoted winning caption
  - waiting state: was bare emoji → polished grid BG, spring entrance animation, descriptive subtitle, pulsing status pill
next_steps: apply same polish pass to PixelClashTv.tsx and ShadowClashTv.tsx (voting+crown phases both near-empty, same pattern)
