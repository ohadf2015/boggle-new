status: shipped
attempted: Live word-count audit, GSC dead-page check, fix 2 AdSense defects (guides force-dynamic + leaderboard SSR placeholder)
files_touched:
  - fe-next/app/[locale]/guides/page.tsx
  - fe-next/app/[locale]/leaderboard/page.tsx
next_steps: Monitor GSC impressions on /en/guides (ISR cache should warm within 24h). Leaderboard ssr:false fix removes "Coming soon" from Googlebot HTML on next deploy. Consider adding actual leaderboard snapshot data via ISR fetch so page has real content even without client JS. Blog cadence (Higgsfield hero-image) still blocked on CLI install — manual op.
