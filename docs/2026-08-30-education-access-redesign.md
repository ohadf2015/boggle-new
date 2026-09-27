# Education access page redesign — 2026-08-30

Route: `/[locale]/education/access` (noindex; reached from `/teacher` bounces via `?from=`).
Goal: better-looking landing, signup CTA more appealing, simple, focused.

## Status: code complete and fully verified, UNCOMMITTED

All gates green:

- 16/16 state-machine tests · 658 education tests (82 files)
- `tsc --noEmit` clean · `eslint` clean · impeccable `detect.mjs` → `[]`
- Browser rounds at 1440px, 390px, and `he` RTL
- **Production build `BUILD_RC=0`** (`NEXT_BUILD_DIR=.next-access-preview npm run build`):
  compiled in 6.0min, TypeScript phase clean, 217/217 static pages, 0 errors.
  Scratch dist dir already deleted.

Only step left is the commit.

## Files (commit ONLY these — the tree has other sessions' blast/multiplayer work)

- `fe-next/app/[locale]/education/access/PageClient.tsx`
- `fe-next/components/education/AccessRequestGate.tsx`
- `fe-next/app/[locale]/education/__tests__/AccessPageClient.stateMachine.test.tsx`
- `fe-next/translations/{en,es,he,ja,ru,sv}.js`  (+6/-1 each, verified no foreign edits)
- `fe-next/public/images/education-access-hero.webp`  (new, 67KB)

Suggested message: `feat(education): rebuild the access landing around one signup CTA`

## What changed

- Two-column persuade hero: h1 → lede → trust row → CTA card, art beside it on desktop and
  *after* the CTA on mobile (phones are the primary device; the CTA outranks the art).
- Three same-size step cards → one divided ribbon. "Not a teacher?" boxed section with three chunky
  colored buttons → one line + three text links, so nothing competes with the CTA.
- Signup button: small inline chip → full-width lime block, `shadow-hard-lg`, hover lift,
  RTL-aware arrow via `DirectionalIcon`, micro-trust line beneath.
- Copy: `auth_required_cta` "Sign up or sign in" → "Create my free teacher account".
  New keys `trust_instant`, `trust_free`, `trust_nologins`, `cta_micro`, `hero_alt`.
- Hero art generated with Higgsfield (`gpt_image_2`), deliberately **text-free** — that is why one
  image serves all six locales instead of the `education-hero-{locale}` ×6 pattern.

## Two bugs fixed en route

1. **`hasAccess: true` + `status: 'none'`** (teacher granted directly, no `access_requests` row)
   rendered the approved card AND a full signup pitch. `hasAccess` and `status` resolve from
   different async sources — see `useTeacherAccess.profileRace.test.tsx`. Gate is now
   `!isLoading && status === 'none' && !hasAccess`; covered by a new test.
2. **Contrast:** `neo-pink` on `neo-navy` = 4.18:1, `neo-purple` = 3.15:1 — both fail AA for 14px.
   Fine as filled buttons (black/white ink on the fill); demoting them to *text* links moved them
   onto the failing side. Now white text + colored underline.

Also deleted the hero GSAP timeline: it set the SSR-rendered `h1` to `opacity: 0` then faded it in,
an above-the-fold flash on mobile Chromium (Class 5). Below-fold `useGsapReveal` scroll reveals kept
— those are IntersectionObserver-based and already snap under `prefers-reduced-motion`.

## Open / not done

- `education.access.next.step1_body` has drifted between locales: EN "Fill the form below — takes 60
  seconds", ES "5 campos, 60 segundos". The form asks **2** fields (role + use case), so the ES "5
  campos" is wrong. Left alone — factual copy change, out of scope for a visual pass.
- `DistrictUpsellStrip` keeps its own `max-w-3xl mx-auto`, so it sits narrower than the rest of the
  page. Reads as intentional de-emphasis for an upsell; not changed.

## Incident

I started a second `npm run dev` while another session had one on :3001. Both write `.next`; their
server then answered **HTTP 200 with a 2-byte `{}` body** on every route for ~20 min until their
in-flight build rewrote it. Escape hatch is `NEXT_BUILD_DIR` — see memory
`next-build-dir-isolates-concurrent-servers-2026-08-30`.
