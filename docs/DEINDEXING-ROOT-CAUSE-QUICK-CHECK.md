# Google Deindexing - Root Cause Quick Check

## IMMEDIATE ACTION (5 minutes)

Your site was previously indexed. Something changed that caused Google to remove pages. This is almost always one of 3 things:

1. **Environment variable set incorrectly** (70% probability)
2. **Server returning error status codes** (20% probability)
3. **Build failure / deployment issue** (10% probability)

---

## STEP 1: Check Environment Variables

**In your production deployment, run:**

```bash
# SSH into your production server/container
env | grep -E "NEXT_PUBLIC_IS_PREVIEW|RAILWAY_ENVIRONMENT_NAME|NODE_ENV"
```

**What you should see:**
```
NODE_ENV=production
NEXT_PUBLIC_IS_PREVIEW=      (empty or not present)
RAILWAY_ENVIRONMENT_NAME=    (empty or 'main' or 'master', NOT 'pr-*')
```

**What would CAUSE deindexing:**
```
NEXT_PUBLIC_IS_PREVIEW=true        ❌ BLOCKS INDEXING
RAILWAY_ENVIRONMENT_NAME=pr-123    ❌ BLOCKS INDEXING
```

---

## STEP 2: Test Production Server Headers

**From your local machine, run:**

```bash
# Test home page
curl -I https://www.lexiclash.live/en

# You should see:
# HTTP/2 200
# (NO line with: X-Robots-Tag: noindex)
```

**If you see:**
```
HTTP/2 200
X-Robots-Tag: noindex, nofollow
```

That's the problem. Google will not index.

---

## STEP 3: Check robots.txt Response

**From your local machine, run:**

```bash
curl https://www.lexiclash.live/robots.txt | head -20
```

**Should see:**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/static/
...
Sitemap: https://www.lexiclash.live/sitemap.xml
```

**If you see:**
```
User-agent: *
Disallow: /
```

That's a problem. The entire site is blocked.

---

## STEP 4: Verify Build Success

**Check your deployment logs for:**

```
> npm run build
...
> Type checking...
> Compiling...
> Linting...
✓ Ready
✓ Compiled
```

**Look for errors like:**
```
✗ Build failed
✗ Compilation failed
error: NEXT_PUBLIC_IS_PREVIEW not set
```

If build failed, pages won't be deployed correctly.

---

## STEP 5: Check Recent Deployments

**In your deployment platform (Railway/Vercel/etc):**

1. When was the last deployment?
2. Did it succeed or fail?
3. What changed in that deployment?
4. Were environment variables modified?

**Suspicious commits around deindexing time:**
- `app/robots.js` modified
- `app/sitemap.js` modified
- `next.config.mjs` modified
- Environment configuration changed

---

## STEP 6: Google Search Console Investigation

**Go to https://search.google.com/search-console**

1. Click on your property (www.lexiclash.live)
2. Go to **Coverage** report
3. Look at the **Indexed pages** graph
4. **When did it drop off?** (exact date)
5. Click **Excluded** tab - why are pages excluded?

**If you see:**
- "Excluded by robots.txt" → Issue is robots.txt or X-Robots-Tag
- "Excluded by noindex" → Issue is meta robots or X-Robots-Tag
- "404 - Not found" → Issue is server returning wrong status code
- "500 - Server error" → Issue is server crash

---

## STEP 7: Test Individual Pages

**For each status code, run:**

```bash
# Test different locales
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://www.lexiclash.live/en
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://www.lexiclash.live/he
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://www.lexiclash.live/sv

# Test game pages
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://www.lexiclash.live/en/singleplayer
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://www.lexiclash.live/en/multiplayer
```

**All should return `HTTP 200`**

If any return `HTTP 404` or `HTTP 500`, that's a problem.

---

## QUICK DIAGNOSIS FLOW

```
Did X-Robots-Tag header appear?
├─ YES → NEXT_PUBLIC_IS_PREVIEW or RAILWAY env issue
│  └─ Fix: Set NEXT_PUBLIC_IS_PREVIEW=false and redeploy
│
└─ NO → Check other causes
   ├─ Do pages return HTTP 200?
   │  ├─ NO → Server/application error
   │  │  └─ Check logs, fix errors, redeploy
   │  │
   │  └─ YES → Check robots.txt
   │     ├─ Contains "Disallow: /" only?
   │     │  └─ Fix: Verify sitemap.js is generating correctly
   │     │
   │     └─ Allows "/" (has Allow: /)?
   │        └─ Check Google Search Console
   │           ├─ Are pages indexed?
   │           │  ├─ NO (excluded) → Check reason in Coverage report
   │           │  │
   │           │  └─ YES → Request re-crawl via URL Inspector
   │           │
   │           └─ Check crawl stats
   │              └─ Any crawl errors or blocked by robots.txt?
```

---

## LIKELY ROOT CAUSES BY SCENARIO

### Scenario A: Environment Variable Set to 'true'
```
NEXT_PUBLIC_IS_PREVIEW=true
↓
next.config.mjs line 272-275 activates
↓
Sets header: X-Robots-Tag: noindex, nofollow
↓
Google removes from index
↓
FIX: Set NEXT_PUBLIC_IS_PREVIEW to empty or 'false', redeploy
```

### Scenario B: Using PR Preview Environment in Production
```
RAILWAY_ENVIRONMENT_NAME=pr-123
↓
next.config.mjs line 22-23 detects PR environment
↓
Sets header: X-Robots-Tag: noindex, nofollow
↓
Google removes from index
↓
FIX: Deploy to 'main' or 'production' environment, not PR
```

### Scenario C: Build Failure
```
npm run build fails
↓
Deployment uses old build
↓
robots.js doesn't execute / returns error
↓
robots.txt returns 404 or error page
↓
Google sees site as broken
↓
FIX: Fix build errors, verify successful build and deploy
```

### Scenario D: Server Returning Error Status
```
Database down / API unreachable
↓
Pages throw errors and return HTTP 500
↓
Even with correct robots.txt, Google delist error pages
↓
Google stops crawling entire site
↓
FIX: Fix backend issues, ensure all pages return HTTP 200
```

---

## FASTEST RECOVERY PATH

### If Environment Variable Issue (Most Likely):
1. **Identify:** Which env var is wrong?
2. **Fix:** Correct the value in deployment configuration
3. **Redeploy:** `git push` or manually trigger deployment
4. **Verify:** `curl -I https://www.lexiclash.live/en` shows no `X-Robots-Tag: noindex`
5. **Resubmit:** Google Search Console → Sitemap → Request re-crawl
6. **Wait:** 1-2 weeks for re-indexing

### If Server/Build Issue (Less Likely):
1. **Check:** Are pages returning HTTP 200?
2. **Debug:** Review deployment logs and server logs
3. **Fix:** Resolve errors, ensure all dependencies work
4. **Redeploy:** `npm run build && npm run start` (test locally first)
5. **Verify:** All pages return HTTP 200
6. **Resubmit:** Google Search Console → Request re-indexing
7. **Wait:** 1-2 weeks

---

## COMMANDS TO RUN RIGHT NOW

**Copy-paste this entire block to diagnose:**

```bash
echo "=== Environment Check ==="
env | grep -E "NEXT_PUBLIC_IS_PREVIEW|RAILWAY_ENVIRONMENT_NAME|NODE_ENV"

echo ""
echo "=== HTTP Status Check ==="
curl -o /dev/null -s -w "HTTP Status: %{http_code}\n" https://www.lexiclash.live/en

echo ""
echo "=== X-Robots-Tag Header Check ==="
curl -sI https://www.lexiclash.live/en | grep -i "x-robots"

echo ""
echo "=== robots.txt Check ==="
curl -s https://www.lexiclash.live/robots.txt | head -5

echo ""
echo "=== sitemap.xml Check ==="
curl -s https://www.lexiclash.live/sitemap.xml | grep -c "<url>" | xargs echo "Sitemap URLs:"

echo ""
echo "=== Title Tag Check ==="
curl -s https://www.lexiclash.live/en | grep -o "<title>.*</title>"
```

---

## ACTION ITEMS

- [ ] Run the commands above and note results
- [ ] Check Google Search Console Coverage report for deindex date
- [ ] SSH into production and verify environment variables
- [ ] Review deployment logs around deindex date
- [ ] Check if NEXT_PUBLIC_IS_PREVIEW was recently set to 'true'
- [ ] Check if deployment switched to PR preview environment
- [ ] Verify HTTP status codes with `curl -I`
- [ ] If environment issue: Fix and redeploy
- [ ] If other issue: Review logs and fix root cause
- [ ] Resubmit sitemap in Google Search Console
- [ ] Use URL Inspector to request re-indexing
- [ ] Monitor Search Console for re-indexing progress

---

## GOOGLE SEARCH CONSOLE ACTIONS

**Once you've fixed the issue:**

1. Go to https://search.google.com/search-console
2. Select your property
3. Go to **Sitemaps**
4. Click **Resubmit** on your sitemap
5. Go to **URL Inspection**
6. Test your home page URL: `https://www.lexiclash.live/en`
7. Click **Request indexing** button
8. Wait 24-48 hours, then check **Coverage** report

---

## MONITORING

After fix, monitor:
- **Coverage report** - Should see indexed pages increase
- **Crawl stats** - Googlebot should start crawling again
- **Index status** - Should go from 0 → growing
- **Search traffic** - Rankings should recover in 1-2 weeks

If not improving after 1 week, something else is wrong. Check:
- Core Web Vitals degradation
- Robot.txt blocks important pages
- Server errors in logs
- Site speed (Page Experience signals)

---

## CONTACT POINTS

If issue persists after all checks:
1. Google Search Console Help: https://support.google.com/webmasters
2. Test with: https://search.google.com/test/rich-results
3. Mobile-Friendly Test: https://search.google.com/mobile-friendly

