# Education separation

Owner ask (2026-11-07): a whole new URL for education, with a home for students and teachers, or another way to keep it more separate from the word-game site.

## Reading chosen

More separation **inside the current URLs**, plus one new entry URL. A new domain is option B below, for the owner to decide.

Today's paths stay because printed and shared `/join` codes, classroom QR codes, native deep links, the Google Classroom add-on's registered URLs (`/education/classroom-addon/*`), SEO pages and Growth Radar's per-path baselines all point at them.

## Phase 1 (this change)

1. **One education entry URL: `/{locale}/classroom`.** It sends a teacher to `/teacher`, a student to `/student` and a guest to the `/education` landing page. It shows a loading state until the role is known and never guesses. This is the address to print, say out loud, and link from the consumer menu.
2. **One list of education sections.** Five path lists used to decide edu chrome, ads, quiet prompts and error homes, and they disagreed. `lib/navigation/eduSections.ts` now holds the one list (`teacher`, `student`, `join`, `education`, `classroom`, `report`, `pricing`). Each check states its own exception next to it:
   - **site chrome:** the whole list. `/report` (parent reports) newly loses the game-site nav.
   - **ad-free:** the list plus `/admin`, minus `/pricing`, which deliberately keeps ads.
   - **error home:** the list plus the edu SEO landings. `/report` and `/pricing` errors now return to the education home.
   - **quiet prompts:** unchanged. The `/education` landing deliberately keeps install prompts.
   - `/classroom` is registered with the proxy's known routes, or it would 404 in production.
3. **Guard test.** It fails when a new folder under `app/[locale]/` looks like an education route but isn't on the list.

Deliberately left alone:
- The six top-level edu SEO pages (`word-games-for-the-classroom` and the others) keep the site footer. It carries their internal links, and changing their chrome or ads would hit pages Search Console is grading.
- The student result share link to `/daily` stays: it's a deliberate growth link, and the shared text carries no student data.

## Phase 2 (done): separate host and student live routes

`/education/live` serves both the teacher's board and the student's seat from one URL, told apart only by `?host=1` and `?practiceSeat=1`. The 2026-11-07 practice-run bug (the host page took the student branch and waited forever) comes from that shared surface. Done:
- The teacher's board lives on `/education/live/host?room=`. On the live routes, the path alone decides who is host. A stray `host=1` on the student route is ignored.
- Old `?host=1` links redirect to the host route: the proxy (307) on the web, and a client gate on native builds that renders nothing until the redirect fires, so the room hook never joins as a student.
- Legacy `/multiplayer?classroom=true&host=true` links go straight to the host route.

## Option B (owner decision): a separate domain

For example `class.lexiclash.live`, rewritten by the proxy to the same app. Owner-side work it needs:
- DNS records.
- A Railway custom domain.
- Supabase auth cookie domain set to `.lexiclash.live`, plus allowed redirect URLs.
- Google OAuth redirect URIs.
- The Classroom add-on manifest URLs.
- A Search Console property, with canonicals decided so the two hosts don't compete.

Gain: a brand and address with no game-site look at all. Cost: the infra above, plus a split SEO footprint.
