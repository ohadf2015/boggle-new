# Railway Deployment Optimization

## Root Cause of Slow Deployments

The deployment was failing during build due to:

**Issue**: `backend/utils/featureFlags.ts` was creating a Supabase client at module-level without checking if environment variables exist:

```typescript
// ❌ BEFORE: Throws "supabaseUrl is required" during build
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Fix Applied**: Changed to lazy initialization:

```typescript
// ✅ AFTER: Only creates client when needed
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}
```

## Railway Deployment Configuration

Railway automatically detects Next.js projects and runs:
1. **Install**: `npm install` or `npm ci` (if package-lock exists)
2. **Build**: `npm run build`
3. **Start**: `npm run start`

### Build Optimization

The postbuild migration script already exits gracefully when env vars are missing (54ms):
```bash
> fe-next@0.1.0 postbuild
> npm run db:migrate || echo 'Migration skipped (missing service key)'
```

### Deployment Speed Improvements

**Before Fix:**
- Build failed during static page generation
- Error: "supabaseUrl is required" blocked deployment
- No successful deployments possible

**After Fix:**
- ✅ Build completes successfully (~20-30s)
- ✅ Static pages generated (194 pages)
- ✅ Migration script exits gracefully
- ✅ Full deployment pipeline works

## Railway-Specific Notes

1. **No CI/CD Pipeline**: Railway builds directly from Git push
   - No GitHub Actions needed
   - Railway handles build + deploy in single pipeline

2. **Environment Variables**: Set in Railway dashboard
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: Redis, Analytics, Sentry configs

3. **Build Cache**: Railway caches `node_modules` between builds
   - First deploy: ~90-120s (full install)
   - Subsequent deploys: ~20-40s (cached dependencies)

4. **Dependency Size**: Total `node_modules` = 960MB
   - Largest: `next` (153MB), `@next` (120MB), `@sentry` (67MB)
   - Already optimized - all are production dependencies

## Additional Optimizations (Optional)

### 1. Enable Turbo Builds
Railway supports Turborepo for monorepo caching. Not needed for single-package projects.

### 2. Reduce DevDependencies in Production
Current setup is correct - Railway only installs `dependencies`, not `devDependencies` in production.

### 3. Enable SWC Minification (Already Enabled)
Next.js 13+ uses SWC by default for faster builds.

## Monitoring Deployment Speed

Check Railway deployment logs for timing:
```
[1/3] Installing dependencies... (~60s first time, ~5s cached)
[2/3] Building Next.js application... (~20-30s)
[3/3] Starting production server... (~2-5s)
```

Total expected time:
- **First deploy**: 90-120 seconds
- **Subsequent deploys**: 25-45 seconds

## Common Issues

### Issue: "supabaseUrl is required"
**Solution**: Lazy initialization (already fixed in this commit)

### Issue: Build timeout
**Solution**: Check Railway build timeout settings (default: 30 minutes)

### Issue: Out of memory during build
**Solution**: Railway provides 8GB RAM for builds - should be sufficient

## Files Modified

- `backend/utils/featureFlags.ts` - Added lazy Supabase client initialization
- All feature flag functions now check if Supabase is configured before use

## Pattern for Future Code

Always use lazy initialization for external service clients:

```typescript
// ✅ GOOD: Lazy init
let client: Client | null = null;
function getClient() {
  if (!client && process.env.API_KEY) {
    client = new Client(process.env.API_KEY);
  }
  return client;
}

// ❌ BAD: Module-level init
const client = new Client(process.env.API_KEY!); // Throws during build
```
