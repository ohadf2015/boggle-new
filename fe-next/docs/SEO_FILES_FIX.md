# SEO Files Availability Fix

## Problem
The project had conflicting static files and route handlers for critical SEO files, causing 500 errors in production.

## Root Cause
Next.js throws errors when both a static file in `/public/{filename}` AND a route handler in `/app/{filename}/route.ts` exist for the same path:

- `/public/ads.txt` + `/app/ads.txt/route.ts` = **CONFLICT** ❌
- `/public/robots.txt` + `/app/robots.js` = **CONFLICT** ❌
- `/public/app-ads.txt` + `/app/app-ads.txt/route.ts` = **CONFLICT** ❌

## Solution
**Use route handlers ONLY** for critical SEO files to ensure 100% availability across all deployment platforms.

### Files Changed:

1. **Removed Static Files:**
   - ❌ `/public/ads.txt`
   - ❌ `/public/app-ads.txt`
   - ❌ `/public/robots.txt`

2. **Created Route Handlers:**
   - ✅ `/app/ads.txt/route.ts` - Google AdSense authorization
   - ✅ `/app/app-ads.txt/route.ts` - Mobile app ads authorization
   - ✅ `/app/robots.js` - Already existed (dynamic robots.txt)

3. **Kept Static Files:**
   - ✅ `/public/llms.txt` - No route handler conflict

## Benefits

1. **Guaranteed Availability**: Route handlers are always served correctly
2. **Deployment Agnostic**: Works on Vercel, Railway, Docker, etc.
3. **Dynamic Content**: Can adjust content based on environment (e.g., staging vs production)
4. **Proper Caching**: Route handlers set appropriate `Cache-Control` headers

## Testing
All 30 E2E tests pass:
```bash
npm run test:e2e -- static-files
```

Tests verify:
- ✅ ads.txt is accessible at `/ads.txt`
- ✅ app-ads.txt is accessible at `/app-ads.txt`
- ✅ robots.txt is accessible at `/robots.txt`
- ✅ llms.txt is accessible at `/llms.txt`
- ✅ All files have correct `Content-Type: text/plain`
- ✅ All files contain expected content

## Future Considerations

If adding new static SEO files (e.g., `security.txt`, `humans.txt`):
1. Create a route handler in `/app/{filename}/route.ts`
2. Do NOT add to `/public/`
3. Add E2E test in `/e2e/static-files.spec.ts`

## References
- [Next.js Metadata API - robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [IAB Tech Lab ads.txt Specification](https://iabtechlab.com/ads-txt/)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
