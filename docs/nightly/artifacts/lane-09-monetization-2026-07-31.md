status: research-only
attempted: education upsell lead-capture + IAP/ad-instrumentation gap audit
files_touched: none
findings:
  - education/for-schools lead-capture (pricing $149/yr, contact form) ALREADY shipped by a prior lane -- the guardrail's "NO pricing, NO lead capture" premise is stale, verified via for-schools/content.ts + PageClient.tsx wiring.
  - RemoveAdsProbe (settings, iap_viewed/iap_tapped probe) and SupporterInterestCard (profile) are BOTH already wired and rendering -- a first grep with a wrong CWD (fe-next/fe-next/... after already cd'ing into fe-next) falsely showed them as dead/unwired; corrected before touching anything. No action needed, no code change made.
  - Ad instrumentation (rewarded_ad_offered/watched/declined) has broad caller coverage across DoubleGoldAdButton, TimeLowAdPrompt, WatchAdButton, BossRushResults, RetryAssistModal, WatchAdForFreezeButton, ShareSection, MemoryHuntCluePanel -- no obvious missing-writer gap found in the time available.
  - 3 other files in the working tree (growthTracking.ts, LightningRound.tsx, useMultiplayerJoin.ts) are mid-edit by a concurrent lane tonight -- avoided touching them to prevent collision.
  - Revenue brief this run: only signal is rewarded_ad_watched 3/24h (informational, matches 7d avg ~3.4) -- not a lever, no safe autonomous action indicated.
next_steps: |
  - No monetization gap found tonight after ruling out the 3 candidates above (all already shipped/wired). Tomorrow: audit the FULL rewarded-ad offered->watched->declined funnel per surface (6 rewarded + interstitial-on-6-results) for a silent per-surface Class-4 gap (offered fired but declined never wired, or vice versa) rather than re-checking top-level wiring.
  - Revenue snapshot still stale per brief note -- founder should run scripts/nightly/lib/pull-revenue-snapshot.sh or provision ADMOB_API_TOKEN for unattended revenue data.
  - No impact-ledger entry: nothing shipped.
