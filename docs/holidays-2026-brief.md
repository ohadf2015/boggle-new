# Winter holidays 2026 — build brief (shared by all builders)

Worktree: `/Users/ohadfisher/git/boggle-wt-holidays` (branch `feature/winter-holidays-2026`). Code in `fe-next/`.
Read `fe-next/CLAUDE.md` and `.claude/rules/60-recurring-pitfalls.md` first. Approved visual reference:
https://claude.ai/artifact/MtJZqGC5cbx9oJU236otJ4 (art already copied to `fe-next/public/holidays/*.webp`).

## Product
Two limited-time events. Region picks the default; a toggle lets anyone switch to the other if its window is open.
- `hanukkah` "Festival of Lights": 8 Nights track. Windows (local date of the player):
  2026: Dec 4 → Dec 12 · 2027: Dec 24 → Jan 1 2028 · 2028: Dec 12 → Dec 20. Night N = day index from start (night 1 = start date).
  Rewards per night: 1 coins, 2 avatar `holiday:beanie-blue`, 3 coins, 4 `holiday:scarf-blue`, 5 coins, 6 `holiday:dreidel-pin`, 7 coins, 8 `holiday:menorah-crown` + title "Keeper of the Light".
  Board bonus tile: "gelt" (gold).
- `christmas` "Snow Clash": Dec 13 → Jan 1 every year. 12 Gifts track = Dec 14..Dec 25 (gift N = Dec 13+N).
  Rewards: Santa hat, elf hat, antlers, earmuffs, striped scarf, candy-cane glasses spread over days 2,4,6,8,10,12 (`holiday:santa-hat` etc.), coins on other days, day 12 also title "Snow Champion".
  Board bonus tile: "gift" (red).
- Region: Israel if `profiles.country_code === 'IL'`, else timezone `Asia/Jerusalem`/`Asia/Tel_Aviv`, else locale `he`. Israel → hanukkah default, everyone else → christmas.
- Override: cookie `lx_holiday` = `hanukkah|christmas|off`; query `?holiday=hanukkah|christmas|off` sets that cookie (and lets us screenshot out of season: `?holiday=` forces the theme on even outside its window ONLY when also `?holidayPreview=1` or NODE_ENV!=='production').
- Outside every window nothing holiday renders. Earned avatar parts are kept forever.

## Hard rules
- TDD: failing test first (vitest), then code. Given-When-Then.
- No hardcoded UI strings: `t('holiday.xxx')`. Builders A and B do NOT edit `translations/*.js`; append the keys you need with English text to `scratch/holidays/<you>/i18n-requests.md`. Builder C owns translations.
- neo-* tokens only; new colors as `--neo-holiday-*` in `:root` + tailwind theme (Builder A owns `globals.css`/`tailwind.config.js`; others request in their scratch file).
- Files < 500 lines. No comments that restate code.
- Do NOT run `tsc`, `next build`, or the full test suite (other builders share the tree). Run only `npx vitest run <your test files>` and `npx eslint <your files>`.
- Do NOT commit, push, or touch git state. Do NOT run migrations against any remote DB.
- Dark-only game surfaces use `bg-neo-navy`.
- One source of truth for event progress: server (Supabase) for signed-in players; guests see the track read-only with a "sign in to light candles" CTA. No localStorage copy of progress.
- Final reply ≤ 300 words: files created/changed, tests run + result, open requests.

## Ownership
- **A (core/theme):** `lib/holidays/**` (calendar, region, override), pre-paint script in `app/[locale]/layout.tsx` adding `holiday-hanukkah`/`holiday-christmas` class to <html>, `hooks/useHoliday.ts`, `app/holidays.css` (board skin + bonus tile + snow/sparkle ambience, reduced-motion safe) imported from globals, mascot swap component `components/holidays/HolidayMascot.tsx` and its use on the home hero, `components/holidays/HolidayToggle.tsx`.
- **B (event + avatar):** Supabase migration `supabase/migrations/<ts>_holiday_event_progress.sql` (table + RLS), `app/api/holiday/progress/route.ts` (GET progress, POST mark-today-played; idempotent; grants parts into `profiles.premium_avatar_parts` + coins via existing helpers), call site after a finished game, `components/holidays/HolidayEventCard.tsx` + track UI on home (`components/landing/...` slot next to EventBanner), SVG avatar parts in `components/avatar/art/accessoriesHoliday.tsx` registered in catalog/registry/layer rules. Import calendar functions from `lib/holidays/calendar.ts` (A writes it; signatures below).
- **C (email + words + i18n):** `emails/holidayGreeting.tsx` (React Email, neo look, uses `https://www.lexiclash.live/holidays/email-*.webp`), `lib/holidayGreetingEmail.ts`, new `'holiday-greeting'` type in `app/api/admin/send-bulk-email/route.ts` (holiday chosen per recipient by country_code via `lib/holidays/region.ts`; dry-run supported; IL recipients excluded unless body flag `includeIL: true`), admin preview route, fix `backend/data/dateThemedWords.js` Hanukkah/Christmas windows to the dates above, all `holiday.*` keys in 6 locales (en, he, es, sv, ja, ru) including those requested by A/B.

## Shared signatures (A implements, B/C import)
```ts
// lib/holidays/calendar.ts
export type HolidayKey = 'hanukkah' | 'christmas';
export interface HolidayWindow { key: HolidayKey; start: string /*YYYY-MM-DD*/; end: string /*inclusive*/; trackDays: string[] }
export function holidayWindows(year: number): HolidayWindow[];
export function windowFor(key: HolidayKey, localDate: string): HolidayWindow | null; // window containing date
export function trackIndex(win: HolidayWindow, localDate: string): number | null;   // 0-based or null
// lib/holidays/region.ts
export type HolidayRegion = 'IL' | 'world';
export function resolveRegion(i: { countryCode?: string|null; timeZone?: string|null; locale?: string|null }): HolidayRegion;
export function defaultHoliday(region: HolidayRegion): HolidayKey;
export function activeHoliday(i: { localDate: string; region: HolidayRegion; override?: HolidayKey|'off'|null }): HolidayKey | null;
```

## Phase 2 — Holiday Daily + play together (Builder D, starts when a slot frees)
Art: `public/holidays/together-{hanukkah,christmas}.webp`, `table-{hanukkah,christmas}.webp`.
1. **Holiday Daily** (the normal daily challenge, re-skinned while a holiday is active; still counts for the regular daily streak):
   - Hanukkah "Nightly Board": night N board has N gelt tiles (`.holiday-bonus-tile`), so the board lights up through the week like the menorah. Word through a gelt tile = +gelt coins.
   - Christmas "Advent Board": each day hides one themed "gift word" (from dateThemedWords holiday list, in the player's language), shown as a wrapped box with its length ("a 6-letter gift is hidden"). Finding it unwraps the day's gift with a bigger reward.
   - Same board for everyone that day (existing daily seeding), holiday intro card + results card with the day's candle/gift.
2. **Holiday streak = the event track** (B's table): any finished game lights the day; the holiday daily lights it with a glow ("lit by the Nightly Board"). Full run = finale.
3. **Shamash rescue (invite):** a missed day can be relit once per missed day when a friend opens your holiday invite link and finishes a game that day (new row source='friend'). Copy: "The shamash lights the others. Bring a friend to relight night 3." Christmas: "Stocking stuffer: a friend can fill your missed day."
4. **Holiday Table (play together):** create a table → share link (WhatsApp first, `navigator.share`), up to 8 members, valid for the window. Each member's daily score adds to a shared group menorah/tree with a nightly group goal; table leaderboard; finale table badge. Tables: `holiday_tables(id, holiday_key, owner, code, created_at)`, `holiday_table_members(table_id, user_id, joined_at)`; group totals read from existing daily results (no second score store).
5. **Dreidel spin / Cracker pull after the holiday daily:** Hanukkah: spin the dreidel → נ nothing, ג double today's gelt, ה half, ש small bonus (server-rolled). Christmas: cracker pull unlocks when a table-mate or invited friend also finished today's daily → both get a word-pun joke (translated, natural) + coins.
6. **Community counter:** "Candles lit across Israel tonight" / "Gifts unwrapped worldwide today": one cached count query (≤60s cache) on the event card.
7. **Share card:** finale and nightly results share image with the player's avatar wearing the holiday part ("I lit all 8 candles").
Owner: D owns `components/daily/holiday/**`, `lib/holidays/daily*.ts`, `app/api/holiday/{table,rescue,spin,community}/**`, its migration. Minimal hooks into the existing daily component (one mount point each, no rewrites).

### Phase 2 integration points (mapped 2026-11-27)
- Daily board: `utils/dailyChallenge/gridGeneration.server.ts:178` (reads `daily_target_words`), seeded gen `gridGeneration.ts:230`, bonus-word placement `:295-337`; puzzle API `backend/routes/dailyChallenge.ts:46`. Gelt tiles / gift word = deterministic from the same seed (date+lang), client marks positions; server re-validates on submit.
- Play screen `components/daily/DailyChallenge.tsx` (season class at :349-355 → holiday class must win while active). Results `components/daily/WordHuntResultsContent.tsx`; submit `backend/routes/dailyChallenge/wordHuntRoutes.ts:70` (hook gelt/gift bonus + spin token here).
- Streak is derived from attempt tables (`app/api/daily/status/route.ts:158-184` = source of truth); do NOT add a second streak store — holiday streak = `holiday_event_progress` (B).
- Invites: reuse `utils/share.ts` (getJoinUrl/WhatsApp :214), referral `ref` param (`utils/growthTracking.ts:1560`), friends `backend/modules/friendActions.ts`. Rescue attribution: holiday invite link carries `ref` + `holiday=1`; on the friend's finished game, credit the inviter's latest missed day.
- No community counter exists → new cached count over `holiday_event_progress` for today.

## Owner bar (11-27): "impressive, interactive and fun"
- Every holiday moment has motion + sound + feedback: candle ignites with a flame flicker and a soft chime; gift shakes, then unwraps with confetti; dreidel physically spins (decelerating CSS/rAF, lands on its letter); cracker pull is a drag/tap tug with a pop.
- Mascot reacts (bounce/wave) when you light a candle or open a gift; tap the mascot = small easter-egg animation.
- Board: gelt/gift tiles shimmer; word through one bursts gold coins / ribbon.
- Holiday soundtrack (Suno, `public/audio/holidays/{hanukkah,christmas}.mp3`) replaces the menu/background music while the holiday is active, through the existing audio system and its mute setting.
- All motion respects prefers-reduced-motion (static frame instead) and holds 60fps on a 4x-throttled phone (transform/opacity only, no layout animation, no full-screen opacity tweens).

## Phase 3 — holiday streak concept, mystery gift, hide & seek, easter eggs (owner 11-27; DRAFT, refine after research)
**Streak = the holiday itself**
- Hanukkah "44 Candles": night N lights N candles + shamash; the track shows the running total "17 / 44". Night 8 = "Zot Hanukkah" finale: full-menorah ceremony (all flames, music swell, mascot cheer), crown, share card.
- **Mystery Gift that grows:** a wrapped box on the event card that gets bigger/fancier every day the streak holds (Hanukkah: 8 tiers, small blue box → golden box; Christmas: the big present under the tree). Can't open before the finale (night 8 / Dec 25 morning, local time). Tap = it shakes and rattles with a hint line. Contents scale with streak length (coins + exclusive part at full run). A broken day stalls growth instead of shrinking it.
- Christmas: 12 gifts Dec 14–25 + Big Present opens Christmas morning.
**Hide & Seek across the app**
- One hidden item per day (sufganiyah/dreidel for Hanukkah, ornament/elf for Christmas) peeks out of one of ~12 screens (profile, settings, friends, leaderboard, quests, adventure map, how-to-play, daily hub, results, avatar builder, shop/coins, 404 page). Location picked per user per day server-side (seeded by user+date), small, wiggles every ~8s, tappable, keyboard-focusable with aria-label.
- Tap = collect animation + sound, POST /api/holiday/hunt {date} → server checks today's slot for this user. The event card shows a hint ("Tonight's dreidel is hiding somewhere you can see your friends").
- Find all (8 / 12) → title "Seeker" + secret avatar part (golden dreidel pin / golden ornament).
- Plus permanent hidden ones for the window: lost latke on the 404 page, a snowman in Settings > About, gingerbread in the footer.
**Easter eggs (to verify in research)**
- Israeli players' dreidel shows פ, everyone else's ש.
- Secret words on any board trigger a celebration + secret badge: he/en MACCABEE, MIRACLE, LATKE, SUFGANIYAH; Christmas SANTA, RUDOLPH, MISTLETOE, ELF (localized lists per language).
- Tap the mascot 8× (Hanukkah) → it spins like a dreidel; 12× (Christmas) → snowball fight across the screen.
- Shake the phone (devicemotion, where permitted; else long-press) → snow-globe moment.
- Locale moments: sv Dec 13 Lucia candle-crown mascot; es window extends to Jan 6 Reyes (gift arrives then) + hidden figurine in the Jan 6 daily (roscón); ja strawberry cake prop on Dec 24 + 108-bell tap on Dec 31; ru window extends to Jan 7, Dec 31 midnight countdown.
Owner: Builder E (after D) — `components/holidays/hunt/**`, `components/holidays/eggs/**`, `app/api/holiday/hunt/**`, `lib/holidays/hunt*.ts`, `lib/holidays/eggs*.ts`; one-line mount per screen.

### Phase 3 — FINAL after research (supersedes the draft above where they differ)
Art in `public/holidays/`: gift-tier-1..9, peek-{doughnut,dreidel,gelt,ornament,elf,gingerbread,snowman,latke,candycane}, gold-{dreidel-pin(פ/נ),ornament,magnifier,snowglobe,key,bell,candle,medal,cracker-crown}, m-{lucia,dedmoroz,reyes,snowglobe}, lost-latke.
- **Missed days:** soft streak (Fortnite-style catch-up, not Candy-Crush reset): a missed day stalls Mystery Gift growth; it can be recovered by shamash/stocking rescue OR a "holiday comeback" (play 3 games in one day to relight the last missed day, max once per event).
- **Mystery Gift tiers:** gift-tier-1..8 for Hanukkah nights, Christmas maps 12 days → tiers 1..9 (every ~1.3 days). Opens at finale local time; tap = shake + rattle + rotating hint line.
- **Holiday Wrapped:** at the finale, a swipeable recap (words found, longest word, candles/gifts, items found in Hide & Seek, table rank) with a share image. Biggest sharing lever in research (Spotify Wrapped, Duolingo YIR).
- **Hide & Seek:** use peek-* art (Hanukkah: doughnut/dreidel/gelt/latke; Christmas: ornament/elf/gingerbread/snowman/candycane). Finder reward: gold-magnifier "Seeker" title + gold-dreidel-pin (Hanukkah) / gold-ornament (Christmas) avatar part. Permanent eggs: lost-latke on 404 ("This page got lost like a latke in oil"), snowman in Settings > About, gingerbread in footer.
- **Eggs (verified):** Israeli dreidel פ / elsewhere ש (tap the dreidel on the event card → tooltip "נס גדול היה פה"); 44-candles counter; Zot Hanukkah on night 8; dreidel spin with real rules.
- **Locale moments:**
  - sv: Dec 13 Lucia — mascot m-lucia + candle-crown sweep on the home header; Dec 24 15:00–16:00 a gentle "fika break" banner (no Disney names).
  - es: Christmas window extends to Jan 6; m-reyes mascot Jan 5–6; Big gift for es opens Jan 6 morning; Jan 6 daily hides a "haba" bean tile (find it → you "owe the roscón", funny badge) and a figurine tile (luck bonus). Dec 28 Inocentes: the day's daily shows a harmless fake banner ("¡Todas las palabras valen doble!… ¡Inocente!") revealed after 5s.
  - ja: Dec 24 strawberry-cake prop; Dec 31 "Kōhaku": players auto-split red/white, community race of words found, live totals; Dec 31–Jan 1 "108 bells" — tap the bell 108 times secret badge.
  - ru: window extends to Jan 7 (Orthodox Christmas) with m-dedmoroz; Dec 31 "wish before the chimes": a 12-second find-one-word mini-game at local midnight ±1h.
  - en: Boxing Day mention only for GB/CA/AU; Dec 24 "Santa flight": sleigh flies across the header for christmas players; 12 Days Dec 25–Jan 5 keep snow on.
- **Secret words** (any board, localized lists): Hanukkah MACCABEE/מכבי, MIRACLE/נס, LATKE/לביבה, SUFGANIYAH/סופגניה, DREIDEL/סביבון; Christmas SANTA, RUDOLPH, MISTLETOE, ELF, SLEIGH (+ es REYES, sv LUCIA, ja ケーキ n/a for latin boards → skip ja, ru ЁЛКА). Found → confetti + secret badge; badge list hidden until found ("??? 3 secrets left").
- **Mascot taps:** 8× → dreidel spin; 12× → snowball across screen. Shake (devicemotion if permitted, else long-press 2s) → m-snowglobe overlay.
Windows per locale go in `lib/holidays/calendar.ts` (A) as data: christmas end = Jan 1 default, es Jan 6, ru Jan 7.

## Phase 4 — Holiday Arcade mini-games (owner 11-27: "add more fun mini games for each holiday") — Builder F
Hub: route `/[locale]/holiday-arcade` (+ "Arcade" tile on HolidayEventCard), only reachable while a holiday is active (else redirect home). Cover art `public/holidays/arcade-*.webp`. Each game 60–90s, one-thumb playable on phone, keyboard on desktop, ends with score + coins (server-capped) + "Play again" + share; a finished arcade game counts as a finished game for the holiday track (call the same `trackGameEnd` path). Words validated with the app's existing dictionary validation for the player's language (find it; do not ship a word list to the client). Shared shell: `components/holidays/arcade/ArcadeShell.tsx` (timer, score, juice, pause on hidden tab, reduced-motion), each game its own folder.
**Hanukkah**
1. **Oil for 8 Nights** — a menorah whose oil drains continuously; each valid word from the 9-letter rack refills oil by word length. Survive 8 "nights" (each night shorter, candles light one by one). Lose when the oil runs dry. The miracle: once per run, at empty, the last drop holds for 3s ("נס!").
2. **Dreidel Duel** — vs. a bot (or async friend via existing challenge link): spin each turn; the letter sets the rule — נ: pass, ג: a 6+ letter word takes the whole pot, ה: any word takes half, ש/פ (Israel פ): you must add to the pot unless you find a word containing the shown letter. Gelt pot animates; first to 10 gelt.
3. **Sufganiyah Stack** — jelly-doughnut letter balls drop into a 6-wide tray; swipe adjacent doughnuts to spell words and clear them (powdered-sugar burst); the stack rises; long words = jelly splash combo.
**Christmas**
4. **Sleigh Spell** — Santa's sleigh scrolls over rooftops; each chimney shows 4–6 letters; spell a word from them before it passes to drop a gift down (longer word = bigger gift); missed chimneys cost a reindeer bell; 3 misses ends. Speeds up.
5. **Snowball Fight** — words fly in on snowballs: swipe up to catch real words, swipe away fake ones (fakes generated as plausible non-words, verified against the dictionary). Combo meter, frosty screen edges on mistakes.
6. **Wrap It Up** — scrambled gifts on a conveyor: unscramble the word before the box reaches the end; bow-tying animation on solve; bonus "mystery gift" = a themed word.
Locale twists (cheap): en/sv/es/ru/ja copy and themed words per language; Hebrew games RTL.
Ownership F: `app/[locale]/holiday-arcade/**`, `components/holidays/arcade/**`, `lib/holidays/arcade/**`, `app/api/holiday/arcade/**` (score submit + coin cap), translations holiday.arcade.* in all 6 locales. One-line mount of the Arcade tile in HolidayEventCard (coordinate: E may be editing it — put the tile in your own `ArcadeTile.tsx` and add only one import+JSX line).
Priority if time runs short: 1, 4, 5, 2, 6, 3.

## Phase 5 — Holiday landing pages (owner 11-27) — Builder G
One landing page per holiday per relevant language, evergreen URLs (indexed all year; off-season they show "back next December/Hanukkah 2027 starts Dec 24" + still let you play the regular game; never 404). Hanukkah: he (primary) + en; Christmas: en, es, sv, ja, ru (+ he only if research shows demand). Slugs + titles from real keyword research per language (native game names: e.g. Hebrew players search "משחק מילים", "חידון חנוכה", "משחקים לחנוכה"; Spanish "juegos de navidad", "juego de palabras navidad"; Swedish "julspel", "ordspel jul"; Russian "новогодние игры", "игры на новый год слова"; Japanese "クリスマス ゲーム 無料", "言葉 ゲーム"). Research first: Growth Radar (`growth-radar` MCP: list_apps → lexiclash; get_search_performance for existing holiday/seasonal queries) + light keyword volume checks; write `scratch/holidays/G/keywords.md` with chosen slug/title/H1 per page and the evidence.
Content: hero with the holiday mascot + hero art, "Play now" CTA into the holiday event, what's inside (event track, Nightly/Advent board, Holiday Table invite, Arcade games with covers, easter-egg teaser without spoilers), FAQ (real questions: free? works on phone? play with family on TV? kids?), JSON-LD (VideoGame/WebPage + FAQPage + Event with real dates), hreflang between language versions of the same holiday, OG image (use hero art), internal links from home event card + footer seasonal link while active. Natural native copy (humanizer bar: no clipped AI rhythm), RTL for he. Neo-brutalist kit already used by existing landing pages on master (do NOT touch the separate landing-redesign branch/worktree boggle-wt-lp1127).
Repo traps (from .claude/rules/60-recurring-pitfalls.md): new root path must pass `lib/seo/nextHandleGate.ts` and be excluded from next.config permanent locale catch-all redirects; add to sitemap; route files export only allowed Next exports; `routeExports.guard`; SEO freeze rules don't apply to new pages but check `seo-freeze.json` for any page you link-edit. Add a guard test that every holiday landing URL returns through the gate.
Ownership G: `app/[locale]/<holiday slugs>/**`, `components/holidays/landing/**`, `lib/holidays/landing*.ts`, sitemap + gate + next.config entries (only the lines for these pages), translations holiday.landing.* in the relevant locales.

## Screenshot checklist (owner: "screenshots of all when it's done") — every row × {hanukkah he RTL, hanukkah en, christmas en} × {phone 390×844, desktop 1440×900}, via `?holiday=<key>&holidayPreview=1`
1 Home (fresh + returning) with holiday mascot + event card (track, Mystery Gift, community counter, table/rescue cards, arcade tile, toggle) · 2 Board skin in a solo game + bonus tile · 3 Daily: intro, Nightly/Advent board, results card, dreidel spin, cracker pull · 4 Holiday Table: create, invite sheet, table view · 5 Mystery Gift shake + open + Holiday Wrapped slides · 6 Hide & Seek peeker on 3 screens + collected toast · 7 Eggs: mascot tap, secret-word celebration, snowglobe, 404 lost latke, Lucia/Reyes/Ded Moroz/sleigh/Kōhaku moments (fixed dates) · 8 Avatar editor holiday parts + golden parts · 9 Arcade hub + each game mid-play + game over · 10 Landing pages (all languages, in-season + off-season) · 11 Email (he hanukkah, en christmas, ja/ru christmas) rendered HTML · 12 Reduced-motion variant of home + daily.
Publish to the review page as a gallery; open it for the owner.
