# Education UI principles

These rules apply to every teacher and student surface in `/education`, `/teacher`, and `/student`. They exist because a teacher has about 40 seconds between classes, and a student with a live game running should not have to hunt for Join.

## One primary action per screen

Each education screen has exactly one job. Name it. Make it the largest, highest-contrast control. Everything else waits.

- Classroom game setup: **Create Room**
- Teacher dashboard: **Start game** (plus the lesson the teacher came to host)
- Student hub while a class game is live: **Join [Teacher]'s game** — full stop. XP, quests, leaderboard, and play cards stay off the screen until the game ends.

If a new control competes with that action, it does not belong on the first paint.

## Defaults over configuration

Ship a working round without asking. Smart defaults:

- Ritual: Standard (Friday Vocab Battle / Support SPED are one-tap alternatives)
- Timer: 3 minutes
- Board: 4×4
- Mode: Classic, or last-used values when we have them
- Classroom: pre-select when the teacher has only one
- Lesson: pre-select last-used

Do not make a teacher confirm a default they already like.

## Progressive disclosure

Timer, board size, play style, game mode, drill options, and student preview live behind a single **Advanced** disclosure, closed by default. Do not add a second settings accordion. Do not stack Pro upsells — one quiet banner, and never before the first live game.

## Visual language

Keep LexiClash neo-brutalist tokens (`bg-neo-navy`, `border-neo`, `shadow-hard`, Fredoka/Rubik). Simplify layout. Do not invent a new look.

## Copy

All user-facing strings go through `t()` in all five languages (en, he, es, sv, ja). Hebrew is RTL (`dir`, logical `ms`/`me`/`start`/`end`).
