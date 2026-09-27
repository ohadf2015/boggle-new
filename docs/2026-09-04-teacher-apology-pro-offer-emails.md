# Teacher apology + Pro-for-a-year collaboration offer — 2026-09-04

**Status: DRAFTS ONLY. Nothing has been sent.** Review, edit the voice, then send.

## Why these are going out

On 2026-09-04, LogRocket sessions plus the database showed a real class hitting a
wall end to end:

- Classroom **ELA (7th)** (`Q3UQ2J`, Tori Plant, Belcourt K-12 ND) — 5 students
  enrolled between 13:46 and 13:49 UTC. `assignment_completions` = **0**. Nobody
  ever played.
- One student's session: on `/en/join/Q3UQ2J`, then
  `GET /api/education/classroom/preview?code=TZCOQ7` → **400**, then
  `POST /api/education/classroom/join` → **400**.

Two independent, separately-fatal bugs (both now fixed on this branch):

1. **Two different six-character codes, one URL.** The permanent classroom code
   and the live game code shown on the projector both get handed out as
   `/join/<code>`, but that page only ever understood the first. A student typing
   the code off the board got "Classroom not found".
2. **"Play with class" led nowhere.** The button navigated to
   `?code=<game>`, while the multiplayer session only ever reads `?room=`. With
   no room to join, the classroom view fell through to a spinner that could never
   resolve. Every student who pressed it parked there.

Also fixed: the teacher's first classroom never displayed its join code (the
first-run card read a field only ever set on failure), and rosters showed
`Player_570b3674` instead of the student's real name.

## Recipients

| Teacher | Email | Evidence |
|---|---|---|
| Tori Plant | tori.plant@belcourt.k12.nd.us | 3 classrooms, **5 students**, 0 plays — hit both bugs live, in front of a class |
| Diana T. Suarez | suarezdianateresa@gmail.com | 2 classrooms, 0 students |
| Enoc Flores | enoceflores24@gmail.com | 3 classrooms, 0 students |
| María Claudia Franco Camargo | mariaclaudiafc.04@gmail.com | 1 classroom, 0 students |
| Pilar Gili Ferré | pgili2@institutmediterrania.com | 2 classrooms, 0 students |
| Alexander Castro | bucardoalexander894@gmail.com | 1 classroom, 0 students |

Tori gets version A (we know it failed in front of her students). The other five
get version B — they created classrooms and no student ever appeared, which is
the same bug seen from the outside, but we should not claim to know how their
lesson went.

**Note on the offer:** Pro is $9/month, so a year is ~$108. The ask in return is
deliberately soft — feedback and feature requests, and *optionally* an
introduction to other teachers. It should not read as payment for promotion.

---

## Version A — Tori Plant

**Subject:** We broke your class period — and we owe you

Hi Tori,

I'm Ohad, I build LexiClash. I'm writing because I owe you a straight apology.

On Thursday, five of your ELA students joined your class in under four minutes.
Not one of them was able to play. That wasn't your setup — it was two bugs on
our side:

1. The code on your screen and the code that joins your class were two different
   codes, and our join page only understood one of them. Students typing what
   they saw got "Classroom not found."
2. "Play with class" sent students to a loading spinner that could never finish.

Both are fixed now, along with two others we found while digging: your first
classroom's join code wasn't being shown to you at all, and your roster was
listing students as "Player_570b3674" instead of by name.

I'm sorry. You put a class period on the line for an app you'd just found, and
we wasted it.

Two things I'd like to do about it.

First, I'd like to give you **LexiClash Pro free for a year** — reports,
analytics, and the higher class limits. No card, no trial that quietly turns
into a bill.

Second, and this is the actual ask: I'd like it to come with a conversation.
You're the first teacher to get a real class of students into this thing, which
means you've already seen more of its rough edges than we have. If you'd be up
for telling us what's broken and what's missing as you use it — and, only if it
ever earns it, mentioning it to other teachers at Belcourt — that's worth far
more to us than $108.

If that's not something you have time for, say so and I'll switch the Pro year
on anyway. You've more than earned it either way.

Would you be open to a short call, or would email be easier?

— Ohad
LexiClash

---

## Version B — the other five teachers

**Subject:** We had a bug that stopped your students joining — it's fixed

Hi [NAME],

I'm Ohad, I build LexiClash. You created a class with us recently and no
students ever showed up in it. I don't think that was you.

We found two bugs that made joining a class close to impossible:

1. The code shown on the teacher's screen during a game and the code that adds a
   student to your class were two different codes — and our join page only
   understood one of them. Students typing what they saw on the board got
   "Classroom not found."
2. Our "Play with class" button sent students to a loading screen that never
   finished.

Both are fixed, along with the join code not being displayed to you after you
created your first class — which may be why the code never made it to your
students in the first place.

I'm sorry you hit that. Setting up a class and watching nothing happen is a
pretty good reason never to open an app again.

If you're willing to give it one more try, I'd like to give you **LexiClash Pro
free for a year** — reports, analytics, and the higher class limits, no card
required.

What I'd love in return isn't money: it's your read on it. Tell us what's
confusing, what's missing, what would make it actually usable in your room. If
it ever gets good enough that you'd mention it to another teacher, even better —
but that's up to the app to earn, not something I'm asking you to promise.

Want me to switch the Pro year on? Just reply "yes" and I'll do it today.

— Ohad
LexiClash
