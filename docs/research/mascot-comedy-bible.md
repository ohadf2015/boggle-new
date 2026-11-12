# Mascot comedy bible (LexiClash)

Sources: research pass 2026-11-11 (Chuck Jones Road Runner rules, Richard Williams' Animator's Survival Kit, benign violation theory, improv "game of the scene", Peggle/Fall Guys/Untitled Goose Game/Thank Goodness You're Here! postmortems). Inspiration: Rabbids-style party slapstick — principles only, never its content.

## Persona: "the self-appointed word genius"
- **Want:** to be the best word-finder in the room and get credit for it.
- **Flaw:** it can't actually read. It is overconfident and always slightly early, and it hoards shiny letters.
- **Status:** it plays high status and keeps landing low. The comedy lives in that gap.
- **Relationship:** a rival who is secretly your biggest fan. It is jealous of your good words and devastated when you leave.
- **Medium:** every beat is a pose or motion (puffed chest, slow burn, hiding a letter behind its back). It works with no text in all 6 languages.

## Rules
1. **The mascot is beaten only by its own plan, never by the player.** The player's play triggers its self-made disasters. It is humiliated, not harmed.
2. **Sympathy stays with the mascot:** it tries hard and fails often.
3. **Every gag runs anticipation → accent → hold.** Wind up, hit, then freeze long enough to read.
4. **Double take is the default reaction:** a blank first look, then a big second one.
5. **Losses get a slow burn:** a slow look straight at the player, never a fast flail.
6. **Act with brows and posture, never words.** No captions needed.
7. **Benign violation:** the mascot can cheat, sulk or get crushed. It never shames the player.
8. **Find the game, then heighten it:** the same behaviour, bigger each time (a 3-stage escalation).
9. **Running gags evolve one stage per occurrence and retire after the last stage.** Callbacks use what really happened to this player.
10. **Ration gags:** big gags fire on about 1 in 5 eligible events, with a per-session cap. Personal-best-scale overreactions fire at most once a day.
11. **An overreaction is only funny on a rare, real moment.**
12. **Land on the game's beat:** time the hit to the word-submit sound or the timer tick.
13. **Specific and ordinary beats random.** Every gag comes from the mascot's want or flaw.

## Gags (setup → beat → payoff). ✓ = safe in multiplayer and classrooms (quiet mode: small version only)
1. **7+ letter word:** counts on its fingers, runs out, uses its toes, tips over. ✓
2. **Long word again later in the session:** brings a measuring tape; the next time the tape is too short and it tapes two together. ✓
3. **Rejected word:** stamps "approved" too early, the rejection lands, it slowly turns the stamp around. ✓
4. **Third rejection in a round:** opens a giant dictionary, which closes on its head. ✓
5. **Combo building:** each word stacks a tile on its head, and it wobbles more each time. ✓
6. **Combo breaks:** the stack falls, a beat of stillness, then one last tile drops on its nose. ✓
7. **Idle 20s+:** caught secretly tracing a word on the board, then a double take at the player. (solo only)
8. **Last 10s:** pushes against the screen edge as if holding back the timer; at 0 it slides off on the final tick. ✓
9. **New personal best:** a huge overreaction with a drumroll, at most once a day. ✓
10. **Beats its own "record":** pulls out a crumpled score sheet and slowly crumples its own. ✓
11. **Losing a match:** slumps next to you, then offers you half a letter tile. (not in classrooms)
12. **Rare letter (each language's rarest letters):** its eyes follow the tile; a tiny whimper when you use it. ✓
13. **Same word twice:** holds up a "photo" of you entering it a minute ago. ✓
14. **Animal or food word:** acts it out in costume and gets it wrong (a cat costume for "dog"). Needs a tagged word list per language; later.
15. **Quitting mid-round:** caught mid-celebration in a "my turn" crown, which it slowly lowers. (not in classrooms; no guilt text)
16. **Back after days away:** asleep under dust, double take, pretends it was practising (with a visible cheat sheet). ✓
17. **A rival steals your word (multiplayer):** points, protests, then admires the word and secretly writes it down. ✓
18. **Daily streak:** adds one piece to a growing trophy; on day 30 only a foot is visible in the frame. ✓
19. **Streak broken:** has carved a tiny trophy out of a crumb, followed by a beat of shameless pride. ✓
20. **2–3 letter word:** a slow clap that gets slower and stops. ✓

## Never (slop blacklist)
- "Oops!" / "Whoops!" / "Uh-oh!" toasts.
- Puns on the word.
- Emoji or confetti on every event.
- Explaining the joke in text.
- Random with no motive.
- Laughing at the player.
- Guilt copy.
- The same animation twice in a row.
- Reacting to every word.
- Personal-best-scale celebration for an ordinary result.
- Jokes that need text.
- Covering the board, timer or buttons.
- Memes and "lol random".
- Generic "You're amazing!".
- A mascot that is never wrong.

## Testing
- **Variety:** 3–5 variants per event with no immediate repeat, plus a per-player history so callbacks are real.
- **Tracking:** track per-gag shown and skipped in PostHog; cut what gets skipped.
- **Language check:** play every gag with sound off in he and ja. If it needs a caption, rework it.

## Custom clips (Higgsfield, 400-credit cap). Each serves several gags
1. `bonk-dizzy` (pilot) → gags 4, 6
2. `faceplant-popup` (pilot) → gags 1, 9 ending, 19
3. `glass-press` (pilot) → gags 7, 8
4. `slow-burn-stare` → gags 3, 5-rule losses, 20
5. `double-take` → gags 7, 16
6. `puffed-chest-smug` → gags 12, 17
Everything else is composed from existing poses plus motion (GSAP/framer) plus props drawn in CSS/SVG (tile, stamp, tape, trophy).
