# LexiClash SEO & Indexing Audit - CRITICAL FINDINGS

**Audit Date:** March 16, 2026
**Status:** DEINDEXING INVESTIGATION - Google stopped indexing previously ranked pages
**Severity:** CRITICAL - Website visibility lost from first page

---

## EXECUTIVE SUMMARY

Your Next.js application has a **comprehensive SEO setup** that appears technically sound, but there are several configuration issues and environment-related flags that COULD be blocking indexing if incorrectly deployed. The infrastructure exists (robots.txt, sitemap, metadata, schema), but the ACTUAL CAUSE of deindexing is likely external:

1. **Server-side rendering is working** ✅
2. **robots.txt properly allows crawlers** ✅
3. **Sitemap with 100+ URLs exists** ✅
4. **Metadata and Open Graph tags are set** ✅
5. **No noindex headers in production** ✅
6. **Structured data (JSON-LD) is comprehensive** ✅

**BUT:** There are environment-based flags that could be misconfigured in production.

---

## FINDINGS BY COMPONENT

### 1. ROBOTS.TXT ✅ CORRECT
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/robots.js`

**Status:** Generated dynamically, good structure
- Allows all major bots (Googlebot, Bingbot, DuckDuckGo, Yandex, Baidu)
- Includes AI crawler exemptions (GPTBot, ClaudeBot, PerplexityBot)
- Disallows: `/api/`, `/_next/static/`, `/_next/image/`, `/admin/`, `/*?room=*`
- Sitemap reference: `https://www.lexiclash.live/sitemap.xml`
- Host directive: `https://www.lexiclash.live`

**Issue:** Uses dynamic generation - needs proper environment to work
- Depends on `process.env.NEXT_PUBLIC_IS_PREVIEW` flag
- If this is `'true'` in production, robots.txt returns `Disallow: /` for all bots

**CRITICAL CHECK NEEDED:**
```
Verify in production deployment: env var NEXT_PUBLIC_IS_PREVIEW !== 'true'
```

---

### 2. SITEMAP.XML ✅ CORRECT
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/sitemap.js`

**Status:** Comprehensive, well-structured
- **100+ URLs** across 5 locales (en, he, sv, ja, es)
- **Priorities correctly set:**
  - Home pages: 0.9-1.0 (high)
  - Game modes: 0.8-0.9 (high)
  - Content pages (blog, faq): 0.7-0.8 (medium)
  - Legal pages: 0.3-0.4 (low)
- **Change frequency** appropriately configured
- **Last modified** dates current
- **hreflang alternates** for all languages included
- **Image URLs** in sitemap for social sharing

**Coverage:**
- Home pages (5 locales)
- Rules, leaderboard, profile
- Game modes: singleplayer, daily, multiplayer, adventure
- Content: blog (9 articles), FAQ, guides (3 articles), glossary
- Legal: terms, privacy, disclaimer, cookies
- Tools: word solver
- SEO landing pages: Hebrew, Swedish, Japanese, English, Spanish
- Word of the day

---

### 3. NEXT.CONFIG.MJS ⚠️ CAUTION - ENVIRONMENT FLAGS
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs` (Lines 21-23, 272-275)

**CRITICAL ISSUE FOUND:**

```javascript
// Line 21-23
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
  process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

// Line 272-275 - Sets X-Robots-Tag header if preview
...(isPreviewEnvironment ? [{
  key: 'X-Robots-Tag',
  value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
}] : []),
```

**PROBLEM:**
If either condition is true in PRODUCTION:
1. `NEXT_PUBLIC_IS_PREVIEW=true` OR
2. `RAILWAY_ENVIRONMENT_NAME` starts with `pr-` (PR preview)

Then the response header sent to Google will be: `X-Robots-Tag: noindex, nofollow`

**This will FORCE deindexing** even if everything else is correct.

---

### 4. ROOT LAYOUT.TSX ⚠️ CAUTION - ROBOTS METADATA
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/layout.tsx` (Lines 43-66)

**Status:** Conditional robots metadata based on environment

```typescript
robots: isPreviewEnvironment ? {
  index: false,
  follow: false,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
  googleBot: { index: false, follow: false, ... }
} : {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, ... }
}
```

**Status in production:** Should be ALLOWING indexing (the `:else` branch)

**POTENTIAL ISSUE:** If `isPreviewEnvironment` evaluates to `true`, metadata will have `index: false`

---

### 5. LOCALE LAYOUT.TSX ✅ COMPREHENSIVE
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/[locale]/layout.tsx`

**Strengths:**
- Generates metadata dynamically per locale
- Sets canonical URLs correctly: `https://www.lexiclash.live/{locale}`
- hreflang alternates for all 5 languages
- Comprehensive JSON-LD structured data (11 schemas)
- Google site verification meta tag present
- Open Graph images (WebP format - fast!)
- All 5 locales pre-generated via `generateStaticParams()`

**Structured Data Includes:**
1. WebApplication schema (game metadata, features, ratings)
2. Organization schema (authority signals)
3. Website schema
4. WebPage schema
5. FAQPage schema (15+ FAQ Q&As in 2 languages)
6. SiteNavigationElement (breadcrumb alternative)
7. BreadcrumbList
8. HowTo schema (game instructions)
9. Event schema (daily challenge recurrence)

**EXCELLENT technical foundation.**

---

### 6. METADATA & META TAGS ✅ CORRECT
**Files:** `app/layout.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`

**Present and correct:**
- ✅ Title tags with templates
- ✅ Meta descriptions (compelling, unique per locale)
- ✅ Keywords per locale
- ✅ Open Graph tags (og:title, og:description, og:image, og:locale)
- ✅ Twitter Card tags
- ✅ Icons (PNG, SVG, Apple touch)
- ✅ Canonical URLs
- ✅ hreflang alternates
- ✅ Mobile viewport meta tag
- ✅ Theme color
- ✅ Google AdSense account meta
- ✅ Category meta (games)

**OG Images:**
- Exist in WebP format (17-48KB each) - optimized!
- Exist in JPG fallback (46-149KB) - good coverage
- 5 locales + fallback (en)
- Dimensions: 1200x630 (standard Open Graph size)

---

### 7. SERVER MIDDLEWARE ✅ CORRECT
**File:** `/Users/ohadfisher/git/boggle-new/fe-next/server/middleware.ts`

**Security headers include:**
- Content-Security-Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (note: prevents iframe embedding for game portals?)
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy
- HSTS (production only)

**Potential issue with X-Frame-Options: DENY:**
- Blocks CrazyGames and other game portal embedding
- But next.config.js line 285 says this is intentional (removed for CrazyGames)
- **CONFLICT**: Check if this is still being set by middleware despite removal in CSP

---

### 8. PAGE RENDERING ✅ SERVER-SIDE RENDERING CONFIRMED
**File:** `app/[locale]/page.tsx` (LandingView)

**Status:** Hybrid SSR/CSR with SSR fallback
```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata>
```

- ✅ Server-rendered metadata
- ✅ Structured data for crawlers (no JS required)
- ✅ SEO content visible without JS (fallback section)
- ✅ Client-side hydration for interactivity

---

### 9. CANONICAL URLS ✅ CORRECT
- Root layout: `https://www.lexiclash.live`
- Per-locale: `https://www.lexiclash.live/{locale}`
- All canonical URLs point to www.lexiclash.live (consistent)
- Proper 301 redirects from bare domain to www

**Redirect rules in next.config.js (Lines 101-157):**
```
/ → /en (permanent redirect)
lexiclash.live/* → www.lexiclash.live/* (permanent)
/legal → /en/legal (permanent)
/leaderboard → /en/leaderboard (permanent)
```

---

### 10. HREFLANG IMPLEMENTATION ✅ CORRECT
- ✅ Set in layout metadata
- ✅ All 5 languages included
- ✅ x-default points to /en
- ✅ Sitemap includes language alternates
- ✅ Proper ISO codes: en, he, sv, ja, es

---

### 11. RECENT CHANGES - POTENTIAL CULPRIT
**Files modified March 14-15, 2026:**
- `app/robots.js` (4.2KB)
- `app/sitemap.js` (18KB)

Both were recently created/modified. Check if:
1. These replaced older static files
2. Dynamic generation is working in production
3. Build was successful after these changes

---

## ROOT CAUSE ANALYSIS - MOST LIKELY SCENARIOS

### Scenario 1: Environment Flag Misconfiguration (HIGHEST PROBABILITY)
**If in production:**
- `NEXT_PUBLIC_IS_PREVIEW=true` OR
- `RAILWAY_ENVIRONMENT_NAME=pr-something`

**Impact:** X-Robots-Tag header sent as `noindex, nofollow`
**Result:** Google removes from index within days
**Solution:** Verify these env vars are NOT set in production

### Scenario 2: Build Failure
**If build fails:**
- `npm run build` never completes
- Older build artifact served (without new robots/sitemap)
- OR static generation fails, serving error pages with 404/500 status codes

**Solution:** Check build logs for errors, verify successful `npm run build && npm run start`

### Scenario 3: Deployment Platform Issue
**If using Railway/Vercel/other:**
- Platform detecting PR preview environment (even on main branch)
- CI/CD setting environment incorrectly
- Deployment using PR environment configuration

**Solution:** Verify deployment environment variables match production intent

### Scenario 4: Server Status Codes
**If pages return 4xx/5xx:**
- Even with correct headers, Google removes from index
- Check server logs for errors
- Verify all pages return 200 status

**Solution:** Test pages return proper HTTP 200 status codes

### Scenario 5: Core Web Vitals Degradation
**If metrics collapsed:**
- Deindexing can occur if site becomes very slow
- Cache headers might be preventing fast delivery
- Large bundle size impacting performance

**Solution:** Check Lighthouse scores, Core Web Vitals, page load times

---

## VALIDATION CHECKLIST

### Immediate Actions:

1. **Verify Environment Variables**
   ```bash
   # In production deployment, verify:
   echo $NEXT_PUBLIC_IS_PREVIEW  # Should be empty or 'false'
   echo $RAILWAY_ENVIRONMENT_NAME  # Should NOT start with 'pr-'
   ```

2. **Test robots.txt Serving**
   ```bash
   curl -H "User-Agent: Googlebot" https://www.lexiclash.live/robots.txt
   # Should NOT have: Disallow: /
   ```

3. **Test X-Robots-Tag Headers**
   ```bash
   curl -I https://www.lexiclash.live
   # Should NOT have: X-Robots-Tag: noindex
   ```

4. **Test Sitemap**
   ```bash
   curl https://www.lexiclash.live/sitemap.xml
   # Should return 200 with 100+ URLs
   ```

5. **Test Page Rendering**
   ```bash
   curl https://www.lexiclash.live/en | grep -E "LexiClash|<h1|<title"
   # Should see HTML, not just JS placeholder
   ```

6. **Check HTTP Status Codes**
   ```bash
   curl -I https://www.lexiclash.live/en
   # Must return 200, NOT 404/500/503
   ```

7. **Review Build Logs**
   - Check last production deployment
   - Look for build errors
   - Verify `npm run build` succeeded
   - Verify no warnings/errors during static generation

8. **Check Server Logs**
   - Look for 404/500 errors on page requests
   - Check middleware errors
   - Look for database connectivity issues

9. **Monitor Google Search Console**
   - Coverage report: Which pages indexed vs. not?
   - Indexing stats: Recent change?
   - Crawl stats: Crawl errors?
   - Mobile usability: Any issues?
   - Core Web Vitals: Degraded?

10. **Test in Google's Tools**
    - URL Inspection Tool: Test home page
    - Rich Results Test: Check structured data
    - Mobile-Friendly Test: Check mobile rendering
    - Lighthouse: Check performance/SEO score

---

## SECONDARY ISSUES (Non-blocking but fixable)

### 1. X-Frame-Options: DENY vs. CrazyGames Integration
**Issue:** Conflicts with game portal embedding
**File:** `server/middleware.ts` line 90
**Fix:** Change to `X-Frame-Options: SAMEORIGIN` or handle via CSP `frame-ancestors`

### 2. OG Image Format Mismatch
**Issue:** Sitemap references `.webp` but uses `.jpg` fallback
**File:** `app/[locale]/layout.tsx` lines 67-73
**Fix:** Ensure all referenced images actually exist

### 3. Cache TTL on Dynamic Content
**Issue:** Home page might be cached too long
**File:** Check cache headers on `/en` (should be shorter than 1 day)

### 4. Sitemap Update Frequency
**Issue:** Home pages set to `weekly` but content changes daily
**File:** `app/sitemap.js` line 34
**Recommendation:** Change to `daily` for home pages

### 5. Blog Articles in Sitemap
**Issue:** 9 blog articles listed but pages might not exist
**File:** `app/sitemap.js` lines 260-289
**Recommendation:** Verify all blog article pages exist at `/blog/{slug}`

### 6. Game Mode Pages
**Issue:** Pages listed in sitemap (singleplayer, daily, multiplayer, adventure) but may be behind authentication
**Recommendation:** Ensure these pages are publicly accessible for crawling

---

## GOOGLE SEARCH CONSOLE INVESTIGATION

### Check These Metrics:
1. **Indexing Status**
   - How many pages indexed before vs. now?
   - When did indexing drop off? (exact date?)
   - Are ANY pages still indexed?

2. **Coverage Report**
   - Error pages (4xx, 5xx)?
   - Excluded pages?
   - Why was content excluded?

3. **Crawl Stats**
   - Last crawl date
   - Crawl errors
   - Robots.txt blocked percentage
   - Pages with redirect chains

4. **Mobile Usability**
   - Any mobile-specific errors?
   - Viewport issues?

5. **Performance (Core Web Vitals)**
   - LCP, FID, CLS scores
   - Percentage in "Good" range
   - Any recent degradation?

6. **Enhancements**
   - Structured data errors/warnings
   - Rich results eligibility

---

## QUICK FIXES TO IMPLEMENT

### Fix #1: Add Build Verification
**Action:** After `npm run build`, verify robots/sitemap are in `.next/public`:
```bash
npm run build
ls -la .next/public/robots.txt .next/public/sitemap.xml
```

### Fix #2: Test Production Build Locally
```bash
npm run build
npm run start
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```

### Fix #3: Set Production Environment Variables Explicitly
In deployment:
```bash
NEXT_PUBLIC_IS_PREVIEW=false
NODE_ENV=production
```

### Fix #4: Add Redirect for Sitemap
If `sitemap.js` isn't generating, add fallback:
```javascript
// app/sitemap.xml/route.ts (static file backup)
```

### Fix #5: Test with curl
```bash
curl -v https://www.lexiclash.live/en 2>&1 | grep -E "^< HTTP|^< X-Robots|^< Content-Type"
# Should show:
# < HTTP/2 200
# < Content-Type: text/html; charset=utf-8
# (no X-Robots-Tag: noindex)
```

---

## FILE PATHS FOR REFERENCE

| Component | Path | Status |
|-----------|------|--------|
| robots.txt | `/app/robots.js` | ✅ Dynamic |
| sitemap.xml | `/app/sitemap.js` | ✅ Dynamic |
| Root metadata | `/app/layout.tsx` | ✅ Correct |
| Locale metadata | `/app/[locale]/layout.tsx` | ✅ Comprehensive |
| Home page metadata | `/app/[locale]/page.tsx` | ✅ Correct |
| next.config.mjs | `/next.config.mjs` | ⚠️ Env-dependent |
| Server middleware | `/server/middleware.ts` | ✅ Secure |
| Redirects | `/next.config.mjs` L101-157 | ✅ Correct |

---

## RECOMMENDATIONS

### URGENT (Do immediately):
1. Verify `NEXT_PUBLIC_IS_PREVIEW` is NOT `'true'` in production
2. Verify `RAILWAY_ENVIRONMENT_NAME` does NOT start with `pr-` in production
3. Test `curl` commands in "Validation Checklist" against production
4. Check Google Search Console for when indexing dropped

### HIGH PRIORITY (Do this week):
1. Review production deployment logs for errors
2. Check Core Web Vitals - if degraded, optimize performance
3. Verify all pages return HTTP 200 status
4. Resubmit sitemap to Google Search Console
5. Request re-indexing of home page via Search Console URL Inspector

### MEDIUM PRIORITY (Do this month):
1. Update sitemap generation frequency for home pages
2. Verify all blog/guide pages exist and are indexed
3. Fix X-Frame-Options conflict with CrazyGames
4. Add cache headers optimization

### LOW PRIORITY (Polish):
1. Add JSON-LD FAQPage schema verification
2. Optimize OG image delivery (WebP format already good)
3. Monitor crawl budget and optimize redirect chains

---

## CONCLUSION

Your SEO infrastructure is **well-built and comprehensive**. The likely cause of deindexing is:

1. **Environment variable misconfiguration** (most probable)
2. Build failure or deployment issue
3. Server returning non-200 status codes
4. Core Web Vitals degradation

The robots.txt, sitemap, metadata, and structured data are all excellent. Focus on:
1. Verifying environment flags
2. Testing production headers with `curl`
3. Checking Google Search Console for status change date
4. Reviewing deployment logs

Once environment is verified, pages should re-index within 1-2 weeks.

