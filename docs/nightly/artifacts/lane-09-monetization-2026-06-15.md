---
status: research-only
attempted: IAP interest probe (iap_viewed) on daily results — not shipped; time expired before TDD
files_touched: none (artifact only)
next_steps: |
  ## Education upsell — FULLY WIRED (no action needed)
  - SchoolLeadForm on /education/for-schools (line 185) ✓
  - DistrictUpsellStrip on education landing (PageClient.tsx line 216) ✓
  - API route /api/education/school-lead with rate-limit + admin email ✓
  - Events: education_upsell_impression, landing_cta_clicked, school_lead_submitted ✓
  - ONLY gap: no page-view event on for-schools page itself (can't calc form conversion rate)
  - FIX (1 line): add useEffect in SchoolLeadForm.tsx firing
      trackGrowthEvent('education_upsell_impression', { cta: 'for_schools_page_view' })
    This closes the funnel gap: impression → click → page_view → submit

  ## IAP interest probe — PLANNED, NOT SHIPPED
  Ready to build tomorrow (~15 min total):
  1. Create fe-next/components/ads/IapInterestProbe.tsx
     - Small card: "Love LexiClash?" + "We're exploring an ad-free tier. Tap to register interest."
     - CTA button fires: trackGrowthEvent('iap_viewed', { interest: 'no_ads', placement: 'daily_results' })
     - Success state: "Thanks! We'll let you know when it's ready."
     - Pure analytics — no billing, no coins, no economy change
  2. Add translation keys to all 5 locales (en/es/he/ja/sv):
     "iapProbe": { "cta": "...", "body": "...", "button": "...", "thanks": "..." }
     Translations ready to copy:
       en: cta="Love LexiClash?", body="We're exploring an ad-free supporter tier. Tap below to register interest — no payment required.", button="I'd pay for ad-free", thanks="Thanks! We'll let you know when it's ready."
       es: cta="¿Te encanta LexiClash?", body="Estamos explorando una suscripción sin anuncios. Toca abajo para registrar tu interés — sin pago.", button="Pagaría por la versión sin anuncios", thanks="¡Gracias! Te avisaremos cuando esté listo."
       he: cta="אוהבים את LexiClash?", body="אנחנו בוחנים מנוי ללא פרסומות. לחצו להביע עניין — ללא תשלום.", button="הייתי משלם לגרסה ללא פרסומות", thanks="תודה! נעדכן אתכם כשיהיה מוכן."
       ja: cta="LexiClashをお楽しみですか？", body="広告なしプランを検討中です。興味があればタップ — 支払い不要。", button="広告なしに支払いたい", thanks="ありがとう！準備ができたらお知らせします。"
       sv: cta="Älskar du LexiClash?", body="Vi utforskar en annons fri prenumeration. Tryck för att anmäla intresse — ingen betalning.", button="Jag skulle betala för annons-fritt", thanks="Tack! Vi meddelar dig när det är klart."
  3. Wire into DailyChallengResults.tsx (fe-next/components/daily/DailyChallengeResults.tsx)
     Import IapInterestProbe, render after the main results card
  4. TDD: test fires iap_viewed on button click, shows thanks state after
  5. eslint fe-next/components/ads/IapInterestProbe.tsx

  ## Rewarded ads 0/24h — NOT a code bug
  - All 6 surfaces have trackRewardedAdOffered ✓ and trackRewardedAdWatched ✓
  - AdMob live on Android (versionCode 5713 prod)
  - 0/7d avg suggests very few Android sessions OR AdMob fill rate issue
  - No code change possible; founder should check AdMob dashboard for fill rate + eCPM
  - ACTION for human: Check AdMob dashboard for rewarded fill rate on unit IDs in lib/admob-config.ts

  ## FLAG NEEDED (carry forward from learnings)
  - exp-mp-quickplay-wait-v1 [control, wait-overlay] — 94 rage-clicks
  - exp-invite-arrival-clarity-v1 [control, status-card] — 83% invite drop
  - exp-practice-wheel-cta-v1 [control, retry-cta] — 43% practice drop
  - exp-game-abandon-confirm-v1 [control, quit-confirm] — 42% game-completion drop
---
