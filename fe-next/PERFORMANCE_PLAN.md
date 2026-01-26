# LexiClash Performance Improvement Plan

**Status**: CRITICAL - 32.2s Largest Contentful Paint (Target: <2.5s)
**Date**: 2026-01-26
**Goal**: Achieve <2.5s LCP, <200ms TBT, <3.4s Speed Index

---

## Root Cause Analysis

### Current Performance Metrics
- **First Contentful Paint**: 2.1s ✅ (acceptable)
- **Largest Contentful Paint**: 32.2s ❌ (CATASTROPHIC - 13x over limit)
- **Total Blocking Time**: 390ms ⚠️ (should be <200ms)
- **Cumulative Layout Shift**: 0 ✅ (perfect)
- **Speed Index**: 8.6s ❌ (should be <3.4s)

### Critical Issues Identified

#### 1. JavaScript Bundle Size Crisis
**Problem**: 2-3MB of JavaScript blocks initial render
- Largest chunk: 760KB (dddd8bf02ab048d4.js)
- Multiple 300KB+ chunks (59208ecfcebcff0f.js, dbdd9c70ad6d8802.js, cfc392b0cacd820e.js)
- Total initial bundle: ~2-3MB uncompressed

**Impact**: Browser must download and parse all this before rendering content. On slow connections, this takes 30+ seconds.

#### 2. Heavy Dependencies Loaded Immediately
**Libraries that shouldn't be on landing page**:
- **Three.js ecosystem** (~500KB) - 3D graphics for PlayfulBackground
- **Framer Motion** (~200KB) - Animation library
- **Socket.IO client** (~150KB) - WebSocket for multiplayer (not needed on landing)
- **Recharts** (~100KB) - Charting library (not used on landing)
- **React Three Fiber + Drei** (~300KB) - 3D rendering

**Total unnecessary weight**: ~1.2MB on landing page

#### 3. Render-Blocking Resources
Components that block first paint:
```tsx
<GoogleAnalytics />          // Analytics - not critical
<CrazyGamesScript />          // 3rd party SDK - not critical
<WebVitalsReporter />         // Metrics - not critical
<ServiceWorkerRegistration /> // PWA - can defer
<PlayfulBackground />         // 3D animation - luxury feature
```

#### 4. No Critical Rendering Path Optimization
- Everything loads client-side with React
- No static pre-rendering of above-the-fold content
- Heavy useEffect chains run before paint
- No progressive enhancement strategy

#### 5. Bundle Analysis Needed
Current chunk names are hashed - need to identify what's in each chunk

---

## Performance Improvement Strategy

### Phase 1: Emergency Optimizations (Target: <5s LCP)
**Timeline**: Immediate (1-2 hours)

1. **Defer Non-Critical Scripts**
   - Move GoogleAnalytics to load after first paint
   - Move CrazyGamesScript to load after first paint
   - Move WebVitalsReporter to load after first paint
   - Defer ServiceWorkerRegistration

2. **Remove PlayfulBackground from Landing**
   - Disable heavy 3D background on landing page
   - Replace with simple CSS gradient/pattern
   - Save ~500KB of Three.js dependencies

3. **Lazy Load Heavy Components**
   - DailyChallengeBanner (already lazy loaded ✅)
   - OnboardingModal (already dynamic ✅)
   - EmailCaptureModal (already dynamic ✅)
   - Auth components

4. **Remove Unused Dependencies from Landing Route**
   - Socket.IO (only needed in multiplayer/game pages)
   - Recharts (only needed in admin/stats pages)
   - Unused Radix UI components

**Expected Impact**: LCP drops to 8-10s (70% improvement)

---

### Phase 2: Aggressive Optimizations (Target: <3s LCP)
**Timeline**: 2-4 hours

1. **Route-Based Code Splitting**
   - Split landing page bundle from game page bundle
   - Landing should be <300KB total JS
   - Game pages can be heavier (users expect load time)

2. **Component-Level Optimization**
   ```tsx
   // BEFORE: Heavy imports on every page
   import { motion } from 'framer-motion';

   // AFTER: Only import on pages that need it
   const motion = dynamic(() => import('framer-motion').then(m => ({ default: m.motion })));
   ```

3. **Preload Critical Resources**
   - Add `<link rel="preload">` for critical fonts
   - Add `<link rel="prefetch">` for likely next pages
   - Optimize image loading with priority flags

4. **Server-Side Rendering Optimization**
   - Enable static generation for landing page
   - Pre-render above-the-fold HTML
   - Reduce client-side hydration overhead

5. **Font Optimization**
   - Already using next/font (good ✅)
   - Verify font subsetting is enabled
   - Ensure font-display: swap

**Expected Impact**: LCP drops to 3-4s (85% improvement)

---

### Phase 3: Advanced Optimizations (Target: <2.5s LCP)
**Timeline**: 4-8 hours

1. **Tree Shaking & Dead Code Elimination**
   - Remove unused lodash functions
   - Remove unused Radix UI components
   - Remove unused icon imports (lucide-react)
   - Enable webpack tree shaking for all packages

2. **Progressive Enhancement**
   - Render basic HTML structure server-side
   - Enhance with JavaScript after load
   - Critical styles inline, non-critical deferred

3. **Image Optimization**
   - Already using Next.js Image (good ✅)
   - Verify WebP/AVIF formats are used
   - Add blur placeholders for LCP images
   - Implement responsive image sizes

4. **Third-Party Script Optimization**
   - Move all analytics to web worker
   - Use Partytown for off-main-thread execution
   - Defer all non-critical 3rd party scripts

5. **Critical CSS Extraction**
   - Extract above-the-fold CSS
   - Inline critical CSS in <head>
   - Defer non-critical Tailwind classes

6. **Bundle Size Budgets**
   ```json
   {
     "bundlewatch": {
       "files": [
         { "path": ".next/static/**/*.js", "maxSize": "250kb" },
         { "path": ".next/static/**/*.css", "maxSize": "50kb" }
       ]
     }
   }
   ```

**Expected Impact**: LCP drops to 2-2.5s (92% improvement) ✅

---

### Phase 4: Monitoring & Continuous Improvement
**Timeline**: Ongoing

1. **Performance Monitoring**
   - Set up Lighthouse CI in GitHub Actions
   - Track Core Web Vitals in production (already have WebVitalsReporter ✅)
   - Alert on regression (LCP >3s)

2. **Bundle Size Monitoring**
   - Already have bundlewatch configured ✅
   - Run on every PR
   - Fail CI if bundle size exceeds budget

3. **Regular Audits**
   - Monthly Lighthouse audits
   - Quarterly dependency audits (remove unused)
   - Review new dependencies before adding

---

## Implementation Checklist

### Emergency (Do First)
- [ ] Defer GoogleAnalytics, CrazyGamesScript, WebVitalsReporter
- [ ] Disable PlayfulBackground on landing page (use CSS alternative)
- [ ] Lazy load all modals and heavy components
- [ ] Remove Socket.IO from landing bundle
- [ ] Remove Recharts from landing bundle

### High Priority
- [ ] Implement route-based code splitting
- [ ] Optimize Framer Motion imports (use dynamic import)
- [ ] Enable static generation for landing page
- [ ] Add resource preloading for critical assets
- [ ] Extract and inline critical CSS

### Medium Priority
- [ ] Set up tree shaking for all packages
- [ ] Implement progressive enhancement
- [ ] Optimize third-party scripts with Partytown
- [ ] Add bundle size budgets to CI

### Low Priority
- [ ] Implement advanced image optimization
- [ ] Add blur placeholders for images
- [ ] Fine-tune webpack configuration
- [ ] Explore React Server Components (Next.js 13+ feature)

---

## Bundle Analysis Commands

```bash
# Generate bundle analysis report
ANALYZE=true npm run build

# Check current bundle sizes
du -sh .next/static/chunks/*.js | sort -h -r | head -20

# Identify largest dependencies
npx source-map-explorer .next/static/chunks/*.js
```

---

## Expected Timeline

- **Phase 1 (Emergency)**: 1-2 hours → LCP: 8-10s
- **Phase 2 (Aggressive)**: 2-4 hours → LCP: 3-4s
- **Phase 3 (Advanced)**: 4-8 hours → LCP: 2-2.5s ✅
- **Total Estimated Time**: 8-14 hours

---

## Success Metrics

### Target Performance (Lighthouse Mobile)
- **LCP**: <2.5s (currently 32.2s)
- **FCP**: <1.8s (currently 2.1s)
- **TBT**: <200ms (currently 390ms)
- **CLS**: 0 (currently 0 ✅)
- **Speed Index**: <3.4s (currently 8.6s)
- **Performance Score**: >90 (currently likely <20)

### Bundle Size Targets
- **Landing Page JS**: <300KB (currently ~2-3MB)
- **Landing Page CSS**: <50KB
- **Time to Interactive**: <3s
- **First Input Delay**: <100ms

---

## Notes

- Already using Next.js 16 with App Router ✅
- Already using next/font for font optimization ✅
- Already have bundlewatch configured ✅
- Already have Lighthouse CI scripts ✅
- Image optimization already configured ✅

**Main issue**: JavaScript bundle size. Focus all efforts on reducing initial bundle.

---

## References

- [Web.dev - Optimize LCP](https://web.dev/optimize-lcp/)
- [Next.js Performance Docs](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [Core Web Vitals](https://web.dev/vitals/)
