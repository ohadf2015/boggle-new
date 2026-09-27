# Education image assets

All generated to the LexiClash design system (`.claude/docs/design-system.md`):
solid `neo-navy #1a1a2e` ground, 3px pure-black outlines, hard zero-blur offset
shadows, halftone dots, and the accent families only (lime `#BFFF00`, pink
`#FF1493`, cyan `#00FFFF`, purple `#8B5CF6`, cream `#FFFEF0`). No gradients, no
glow, no glassmorphism — those are explicit anti-references for this brand.

Every one features the existing LexiClash mascot (the crowned ice-cube),
generated against `public/lexiclash-welcome-mascot-nobg.png` as the character
reference so poses stay on-model rather than inventing a new character.

They contain NO text by design: all copy is `t()`, in five languages plus RTL,
so baked-in words would be untranslatable and would break Hebrew.

Every one is mounted as `alt="" aria-hidden="true"` — decoration beside a line
of real text, never the carrier of meaning.

| File | Where it renders |
|---|---|
| `join-hero.webp` | `components/student/JoinClassroomForm.tsx` — above the code card |
| `class-live.webp` | `components/student/ClassroomGameBanner.tsx` — the teacher's game is running |
| `waiting-for-teacher.webp` | `components/student/ClassroomGameBanner.tsx` — idle "listening" strip |
| `no-class-yet.webp` | `app/[locale]/student/PageClient.tsx` — student has no classroom |
| `words-mastered.webp` | `app/[locale]/student/achievements/PageClient.tsx` — page header |
| `share-code.webp` | `components/teacher/PlayTabFirstRunCard.tsx` — the share-the-code moment |
| `pro-hero-poster.webp`, `pro-unlocks.webp` | pre-existing Pro upgrade art |
