# Validation Plan — Before Building Any Android App

> Companion to `2026-05-30-android-money-app-research.md` + `2026-05-30-senior-launcher-prd.md`.
> Core principle (from advisor review): **Play Store ratings are a weak proxy for "underserved." Only talking to users tells you if a wedge monetizes.** Validate cheaply before committing months to a native build.

## The honest constraints
1. **Stack mismatch.** You're a Next.js/web developer; this repo (LexiClash) has no native Android project. All three top picks are **native Android** (launcher = HOME intent + lockdown; on-device Whisper = Kotlin + ML-ops; med reminders = exact alarms vs OEM battery killers). The "build 3/5" feasibility scores understate the ramp. **What you can ship this week = a landing page. What you have infra for = web/PWA + Supabase.** This should bias the pick toward whatever can start web-first.
2. **"Weak incumbent" ≠ opportunity.** A 4.2★/1M-install app can mean the category is hard to monetize/retain, not that there's room. BaldPhone being delisted may mean nobody could make money there. Weak incumbent **+ small/unmonetizable market = trap.**
3. **Community is both moat and cold-start trap.** For the ADHD pick, "peer community" is the differentiator AND the hardest thing for a solo dev to bootstrap (empty community = churn). Tension to resolve: either MVP = "just a great tracker" (then you compete with Bearable on polish, no moat) OR community on day one (cold-start gamble). The senior-launcher PRD smartly deferred community to v0.2; ADHD can't, because community *is* the wedge.

## What to validate (this week, ~$0–50)
Pick **one or two** of the top picks and run the fake-door test. Recommended order given the stack constraint:

1. **ADHD tracker + community** — strongest uncontested wedge (incumbents Inflow/Numo are *coaching* apps, not trackers; Bearable is general, not ADHD-specific). Can prototype **web-first/PWA** → fits your stack, sidesteps native ramp for v0.
2. **Offline transcription for a regulated profession** — clean gap but native/ML-heavy; validate demand before paying the ML-ops cost.
3. (Skip senior launcher for now — downgraded to RISKY: med+caregiver owned by loved 5M+ apps Medisafe/MyTherapy; launcher brand BIG Launcher stronger than its demo rating.)

## The test (per pick)
**A. Fake-door landing page** (Next.js → Vercel; ~half a day, your home turf)
- One page: problem, 3-feature pitch, email capture, a prominent "Get early access — $X" button that opens a "we're launching soon, you're on the list" modal (the fake door).
- Analytics: track page-view → button-click → email-submit funnel (PostHog — already wired in this org).
- **Signal = % of visitors who click the paid button.**

**B. Subreddit probes** (free; non-spammy, value-framed)
- ADHD: r/ADHD, r/adhdwomen, r/ADHD_Programmers — "Building a [X], would this help? what do you use today?" Measure upvotes + "where do I get this" / "I'd pay" comments.
- Transcription: r/therapists, r/LawFirm, r/medicine — same framing, emphasize on-device/privacy.

**C. Complaint mining** (free; 1–2 hrs)
- Pull 1–2★ reviews of the nearest incumbent (Bearable for ADHD; Otter for transcription). Cluster top complaints → confirm they map to your planned MVP. If they don't, you're about to build the wrong thing.

## Kill criteria (decide honestly)
- **Proceed to build** if: landing button-click ≥ ~3% AND ≥1 subreddit post clears ~20 upvotes with genuine "I'd pay / where do I get it" comments AND complaint clusters match your MVP.
- **Pivot** if signal is below that on the first pick → run the test on pick #2 instead of building.
- **Stop** if neither pick clears the bar → the thesis ("vertical subscription on Android as solo web dev") needs rethinking, not more building.

## Recommended immediate action
Build the **ADHD fake-door landing page** (Next.js/Vercel — fits your stack, zero native risk) + post the 3 subreddit probes. One week, ~$0. Then read the funnel before writing a line of app code.

*This is the cheapest path to a real go/no-go. Everything upstream (rankings, PRDs) is hypothesis; this is the experiment.*
