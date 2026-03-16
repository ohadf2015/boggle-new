# SEO Fix Verification Checklist

After implementing fixes, use this checklist to verify everything is working correctly.

---

## PHASE 1: Verify Code Configuration (Local)

### 1.1 Check next.config.mjs Environment Flag Logic

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs` (Lines 21-23)

**Current code:**
```javascript
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
  process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');
```

**This is CORRECT.** The logic checks if either condition is true:
1. `NEXT_PUBLIC_IS_PREVIEW === 'true'` (explicit flag)
2. `RAILWAY_ENVIRONMENT_NAME` starts with 'pr-' (PR preview detection)

**Verification:** This prevents accidental deindexing in preview environments. ✅

---

### 1.2 Check X-Robots-Tag Header Conditional (next.config.mjs)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs` (Lines 268-275)

**Current code:**
```javascript
{
  source: '/:path*',
  headers: [
    // Block indexing for preview/staging environments via X-Robots-Tag header
    ...(isPreviewEnvironment ? [{
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
    }] : []),
    // ... other headers
  ],
},
```

**This is CORRECT.** Only sets noindex header if `isPreviewEnvironment === true`.

**Verification:** ✅

---

### 1.3 Check Metadata Robots Configuration (app/layout.tsx)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/layout.tsx` (Lines 43-66)

**Current code:**
```typescript
robots: isPreviewEnvironment ? {
  index: false,
  follow: false,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
  // ...
} : {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
},
```

**This is CORRECT.** Production environment should use the second branch (index: true).

**Verification:** ✅

---

### 1.4 Check robots.js

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/app/robots.js` (Lines 6-19)

**Current code:**
```javascript
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
  process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

if (isPreviewEnvironment) {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}
```

**This is CORRECT.** Only blocks if in preview environment.

**Verification:** ✅

---

## PHASE 2: Production Deployment Verification

### 2.1 Verify Environment Variables in Production

**Run in production environment:**

```bash
# SSH to production server
env | grep -E "NEXT_PUBLIC_IS_PREVIEW|RAILWAY_ENVIRONMENT_NAME|NODE_ENV"
```

**Expected output:**
```
NODE_ENV=production
# NEXT_PUBLIC_IS_PREVIEW should be empty or not present
# RAILWAY_ENVIRONMENT_NAME should be 'main' or 'master', not 'pr-*'
```

**If you see:**
```
NEXT_PUBLIC_IS_PREVIEW=true          ❌ WRONG
RAILWAY_ENVIRONMENT_NAME=pr-123      ❌ WRONG
```

**Fix:**
1. Go to your deployment platform (Railway, Vercel, etc.)
2. Find production environment variables
3. Ensure `NEXT_PUBLIC_IS_PREVIEW` is NOT set to `'true'`
4. Ensure `RAILWAY_ENVIRONMENT_NAME` is NOT a PR preview
5. Redeploy with correct environment variables

---

### 2.2 Verify Build Process

**Locally, run:**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# Clean build
rm -rf .next dist

# Build with production settings
NODE_ENV=production npm run build
```

**Expected output:**
```
> next build
  ✓ Compiled successfully
  ✓ Linting
  ✓ Type checking
  ✓ Ready in XXs
```

**If you see errors:**
- Fix the errors before deploying
- Verify all dependencies are installed
- Check for TypeScript errors

---

### 2.3 Verify Robots.txt Generation

**After build, check:**

```bash
# In production, test robots.txt generation
curl -v https://www.lexiclash.live/robots.txt 2>&1 | head -30
```

**Expected:**
```
< HTTP/2 200
< Content-Type: text/plain
< Cache-Control: public, max-age=3600

User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/static/
Disallow: /_next/image/
Sitemap: https://www.lexiclash.live/sitemap.xml
```

**If you see:**
```
User-agent: *
Disallow: /
```

Then `isPreviewEnvironment` evaluated to `true`. Fix environment variables.

---

### 2.4 Verify X-Robots-Tag Headers

**Test:**

```bash
curl -I https://www.lexiclash.live/en
```

**Expected:**
```
HTTP/2 200
Content-Type: text/html; charset=utf-8
(NO line with X-Robots-Tag: noindex)
```

**If you see:**
```
X-Robots-Tag: noindex, nofollow
```

Then header is being set. Fix environment variables and redeploy.

---

### 2.5 Verify Metadata

**Test home page:**

```bash
curl -s https://www.lexiclash.live/en | grep -A1 "<title>\|<meta name=\"robots\""
```

**Expected:**
```
<title>LexiClash - Free Multiplayer Word Game</title>
<meta name="robots" content="index, follow, max-image-preview: large, max-snippet: -1, max-video-preview: -1">
```

**If you see:**
```
<meta name="robots" content="noindex, nofollow">
```

Then metadata is set to noindex. Fix and redeploy.

---

## PHASE 3: Google Search Console Actions

### 3.1 Resubmit Sitemap

1. Go to https://search.google.com/search-console
2. Select your property (www.lexiclash.live)
3. Go to **Sitemaps** (left sidebar)
4. Find `sitemap.xml`
5. Click the **three dots** → **Resubmit**
6. Wait for processing

**Expected result:**
- Sitemap accepted
- URLs start being indexed within 24-48 hours

---

### 3.2 Request Indexing for Home Page

1. Go to **URL Inspection** (left sidebar)
2. Enter: `https://www.lexiclash.live/en`
3. Click **Test live URL**
4. Wait for test to complete
5. If successful, click **Request indexing**
6. Confirm indexing request

**Expected result:**
```
✓ URL is indexable
✓ Indexing requested
```

---

### 3.3 Monitor Coverage Report

1. Go to **Coverage** (left sidebar)
2. Check the graph - should show recent drop
3. After fix + resubmit, monitor daily for 1-2 weeks
4. Watch for "Indexed" count to increase

**Expected timeline:**
- **Day 1-2:** No change (Google re-crawls)
- **Day 3-7:** Indexed pages start appearing
- **Week 2:** Most pages should be re-indexed

---

## PHASE 4: Testing Checklist

### 4.1 Test All Locales

```bash
for locale in en he sv ja es; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://www.lexiclash.live/$locale")
  echo "$locale: HTTP $STATUS"
done
```

**Expected:**
```
en: HTTP 200
he: HTTP 200
sv: HTTP 200
ja: HTTP 200
es: HTTP 200
```

---

### 4.2 Test Game Pages

```bash
for page in singleplayer daily multiplayer adventure about contact faq; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://www.lexiclash.live/en/$page")
  echo "$page: HTTP $STATUS"
done
```

**Expected:** All should be `HTTP 200`

---

### 4.3 Test Blog Pages

```bash
curl -o /dev/null -s -w "HTTP %{http_code}\n" \
  https://www.lexiclash.live/en/blog/10-surprising-benefits-word-games
```

**Expected:** `HTTP 200`

---

### 4.4 Test SEO Landing Pages

```bash
for page in "hebrew-multiplayer-word-game" "multiplayer-word-game-online" "swedish-multiplayer-word-game" "japanese-word-game" "juego-de-palabras-multijugador"; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://www.lexiclash.live/en/$page")
  echo "$page: HTTP $STATUS"
done
```

**Expected:** All should be `HTTP 200`

---

### 4.5 Test Sitemap

```bash
curl -s https://www.lexiclash.live/sitemap.xml | grep -c "<url>"
```

**Expected:** Should show 100+ (number of URLs in sitemap)

---

### 4.6 Validate with Google Tools

**Rich Results Test:**
1. Go to https://search.google.com/test/rich-results
2. Paste: `https://www.lexiclash.live/en`
3. Click **TEST URL**

**Expected:**
```
✓ Page is eligible for rich results (FAQPage, WebApplication, etc.)
```

**Mobile-Friendly Test:**
1. Go to https://search.google.com/mobile-friendly
2. Paste: `https://www.lexiclash.live/en`
3. Click **TEST**

**Expected:**
```
✓ Mobile friendly
```

---

## PHASE 5: Performance Check

### 5.1 Core Web Vitals

**Run Lighthouse locally:**

```bash
# Install Lighthouse if not present
npm install -g lighthouse

# Test
lighthouse https://www.lexiclash.live/en --view
```

**Expected:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Note:** Poor Core Web Vitals can cause deindexing. If scores are bad, optimize.

---

### 5.2 Page Speed

```bash
curl -o /dev/null -s -w "Response time: %{time_total}s\n" https://www.lexiclash.live/en
```

**Expected:** < 2 seconds for full response

---

## PHASE 6: Monitoring (Post-Fix)

### 6.1 Daily Monitoring (Week 1)

**Each day, check:**

1. **Search Console Coverage:**
   - Is indexed count increasing?
   - Any new errors?

2. **Test one page:**
   ```bash
   curl -I https://www.lexiclash.live/en
   # Verify no X-Robots-Tag: noindex
   ```

3. **Monitor server logs:**
   - Any 404/500 errors?
   - Unusual crawl patterns?

---

### 6.2 Weekly Monitoring (Weeks 2-4)

**Monitor:**
- Search Console indexed pages → should reach pre-deindex levels
- Search traffic in Analytics → should recover
- Rankings for target keywords → should improve

---

## COMPLETION CRITERIA

Your SEO fix is complete when:

- ✅ `NEXT_PUBLIC_IS_PREVIEW` is NOT set to 'true' in production
- ✅ `RAILWAY_ENVIRONMENT_NAME` is NOT a PR preview
- ✅ `curl -I https://www.lexiclash.live/en` shows NO `X-Robots-Tag: noindex`
- ✅ All pages return HTTP 200
- ✅ `robots.txt` allows `/` and references sitemap
- ✅ `sitemap.xml` returns valid XML with 100+ URLs
- ✅ Sitemap resubmitted in Google Search Console
- ✅ Home page URL indexing requested
- ✅ Google Search Console shows indexed pages increasing
- ✅ Within 1-2 weeks: Most pages re-indexed
- ✅ Within 2-3 weeks: Rankings start recovering
- ✅ Within 4 weeks: Back to normal traffic levels

---

## TROUBLESHOOTING

### If Indexing Doesn't Improve After 1 Week

**Check:**
1. Are pages still returning HTTP 200? `curl -I`
2. Is sitemap still accessible? `curl https://www.lexiclash.live/sitemap.xml`
3. Any server errors in logs?
4. Core Web Vitals degraded?
5. Check Google Search Console for new errors

**If still blocked:**
- Review robots.txt one more time
- Check for 404 redirects
- Verify markup with Rich Results Test
- File a reconsideration request in Search Console

---

## SUCCESS METRICS

After fix is complete:

**Week 1:**
- Sitemap resubmitted ✅
- Home page re-indexed ✅

**Week 2-3:**
- 50%+ of previously indexed pages re-indexed
- Search Console shows upward trend in indexed count

**Week 4:**
- 90%+ of pages re-indexed
- Organic search traffic recovered

**Month 2:**
- Rankings recovered for previous keywords
- Visibility back to pre-deindex levels
- Growth continues normally

