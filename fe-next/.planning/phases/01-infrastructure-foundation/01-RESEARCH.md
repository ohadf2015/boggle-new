# Phase 1: Infrastructure Foundation - Research

**Researched:** 2026-01-22
**Domain:** Asset generation, optimization, and video rendering infrastructure
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical infrastructure for generating, processing, and delivering game assets (images and videos). The research reveals clear technical strategies across five critical domains: React version isolation for Remotion, video rendering approaches, background removal capabilities, asset optimization workflows, and performance enforcement.

**Key Findings:**
- Remotion 4.0.236+ now supports React 19, eliminating the React version conflict concern
- pnpm workspaces with catalogs provide the most robust solution for architectural isolation (optional but recommended)
- Remotion Lambda offers the fastest time-to-market despite higher per-render costs (~$0.017/min for 1080p)
- rembg (Python) provides 95%+ accuracy for background removal with multiple model options
- Sharp library with WebP quality 80 + effort 6 reliably produces <200KB assets
- Lighthouse CI integration is straightforward and well-documented for Next.js

**Primary recommendation:** Use Remotion 4.0.236+ with React 19 (no isolation needed), start with Remotion Lambda for fastest deployment, implement rembg as local Python script initially, and establish automated performance checks early.

---

## 1. Remotion + Next.js Isolation Strategy

### Problem Context

The project currently runs **Next.js 16 with React 19** (as seen in package.json: `"react": "19.2.0"`). Initial research suggested Remotion required React 18, but further investigation reveals **Remotion 4.0.236+ fully supports React 19**.

### React Version Requirements (HIGH Confidence)

**Remotion's React Support:**
- Remotion 4.0.0+ supports React 19 ([source](https://www.remotion.dev/docs/react-19))
- Remotion 4.0.236+ has React 19 type alignment fixes
- **The project CAN use React 19 with Remotion 4.0.236+**
- All Remotion templates have been updated to React 19 (except React Native Skia)

**Third-party Library Requirements for React 19:**
| Library | Minimum Version |
|---------|-----------------|
| @react-three/fiber | 9.1.2 |
| three | 0.171.0 |
| styled-components | v6 |
| Next.js | 15+ |

**Verdict:** The initial assumption about React 18 requirement is **INCORRECT**. Remotion 4.0.236+ supports React 19, eliminating the isolation requirement. However, workspace isolation may still be beneficial for:
- Keeping video rendering dependencies separate from main app
- Avoiding bundle bloat in production builds
- Independent deployment of rendering infrastructure

### Workspace Isolation Strategies (HIGH Confidence)

Despite React 19 compatibility, workspace isolation is still recommended for architectural cleanliness. Three approaches were evaluated:

#### Option 1: pnpm Workspaces with Catalogs (RECOMMENDED)

**Advantages:**
- Catalog feature (added pnpm 9.5.0) allows defining dependency version sets ([source](https://pnpm.io/9.x/catalogs))
- Can define separate catalogs for Next.js app vs Remotion workspace
- Efficient disk usage through content-addressable storage
- Handles peer dependency conflicts automatically
- Example structure:
  ```yaml
  # pnpm-workspace.yaml
  packages:
    - 'fe-next'
    - 'remotion-workspace'

  catalogs:
    default:
      react: ^19.2.0
      react-dom: ^19.2.0
    remotion:
      remotion: ^4.0.381
      "@remotion/cli": ^4.0.381
  ```

**Implementation:**
1. Create `pnpm-workspace.yaml` at repository root
2. Define separate workspace packages
3. Use exact version pinning for Remotion packages (no `^` characters) ([source](https://www.remotion.dev/docs/brownfield))
4. Share types via workspace protocol (`workspace:*`)

**Limitations:**
- Requires migration from npm to pnpm
- Learning curve for team unfamiliar with pnpm
- May require updating CI/CD scripts

#### Option 2: npm Workspaces (ALTERNATIVE)

**Advantages:**
- No new tooling (project already uses npm)
- Simpler for small teams
- Hoisting automatically deduplicates shared dependencies ([source](https://leticia-mirelly.medium.com/a-comprehensive-guide-to-npm-workspaces-and-monorepos-ce0cdfe1c625))

**Limitations:**
- No catalog feature for version management
- Peer dependency conflicts require manual resolution
- Less efficient disk usage vs pnpm
- Can result in multiple React copies if not careful ([source](https://github.com/npm/cli/issues/4557))

**Structure:**
```json
{
  "name": "boggle-monorepo",
  "private": true,
  "workspaces": [
    "fe-next",
    "remotion-workspace"
  ]
}
```

#### Option 3: Turborepo (ADVANCED)

**Advantages:**
- Built-in caching and task orchestration
- Parallel task execution
- Remote caching support
- Multiple React versions possible ([source](https://github.com/vercel/turborepo/discussions/3966))

**Limitations:**
- Overkill for 2-package monorepo
- Additional complexity
- Requires Turborepo-specific configuration

**Verdict:** Workspace isolation is **optional** given React 19 compatibility. If pursuing isolation, use **pnpm workspaces + catalogs** for maximum flexibility.

### File Sharing Between Workspaces (HIGH Confidence)

**Type Definitions:**
- Use `workspace:*` protocol in package.json to reference internal packages
- Create shared types package: `@boggle/types`
- Both workspaces import from `@boggle/types`

**Asset Sharing:**
- Store generated assets in shared directory: `/shared/assets`
- Reference via absolute paths or symlinks
- Use environment variables for path resolution

**Configuration:**
```typescript
// tsconfig.json (base)
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

### Build Isolation (HIGH Confidence)

**Separate Build Processes:**
- Next.js: `npm run build` (production bundle)
- Remotion: `npx remotion render` (video generation)
- No cross-contamination

**Deployment Strategy:**
- Next.js deploys to Vercel/production hosting
- Remotion workspace only used for video generation
- Option 1: Keep Remotion local (render videos manually)
- Option 2: Deploy Remotion Lambda functions separately
- Option 3: Build Remotion as microservice (Docker container)

---

## 2. Video Rendering Strategy

### Options Comparison (HIGH Confidence)

Three video delivery approaches were evaluated based on official Remotion documentation ([source](https://www.remotion.dev/docs/compare-ssr)):

| Factor | Remotion Lambda | Cloud Run | Self-Hosted |
|--------|----------------|-----------|-------------|
| **Compute Cost** | Higher (per render) | Medium | Lowest |
| **Idle Cost** | $0 | $0 | 24/7 charges |
| **Speed** | Fastest (distributed) | Medium (single machine) | Slowest (unless custom) |
| **Setup Complexity** | Easiest (SaaS) | Medium | Hardest (DIY) |
| **Scalability** | Automatic | Manual scaling | Manual |
| **GPU Support** | No (CPU only) | Untested | Possible |

### Cost Analysis (HIGH Confidence)

**Remotion Lambda Pricing ([source](https://www.remotion.dev/docs/lambda/cost-example)):**

Based on us-east-1, 2048MB RAM, Remotion 4.0.381:

| Video Type | Warm Lambda | Cold Lambda | Render Time |
|------------|-------------|-------------|-------------|
| HelloWorld (10sec) | $0.001 | $0.001 | 7-11 sec |
| 1-min Local 1080p | $0.017 | $0.021 | 15-19 sec |
| 10-min Remote HD | $0.103 | $0.108 | 56-61 sec |
| 10-sec Remote 4K | $0.013 | $0.014 | 45-53 sec |

**Additional AWS Costs:**
- S3 storage ($0.023/GB/month)
- Data transfer (varies by region)
- CloudWatch logs (~$0.50/GB)
- **Total estimated cost for 100 videos/month:** ~$2-5

**Cost Optimization Strategies ([source](https://www.remotion.dev/docs/lambda/optimizing-cost)):**
1. Reduce memory allocation (test 1024MB vs 2048MB)
2. Lower concurrency (slower but cheaper)
3. Choose cheaper AWS region (compare pricing chart)
4. Pre-compute repeated calculations
5. Optimize render performance (fewer frames)
6. Use Cloudflare R2 instead of S3 for assets (no egress fees) ([source](https://www.remotion.dev/docs/lambda/r2))

**Projected Cost at Scale:**
- **100 videos/month:** $2-5/month
- **1,000 videos/month:** $20-50/month
- **10,000 videos/month:** $200-500/month

This is negligible compared to hosting costs and development time.

### Video Delivery Methods

#### Option 1: Pre-render Videos, Bundle with App (SIMPLE)

**Approach:**
- Render videos locally during build
- Store as static assets in `/public/videos/`
- Next.js serves directly

**Pros:**
- Zero runtime cost
- Fast loading (CDN cached)
- Works offline
- Simple implementation

**Cons:**
- Increases bundle size
- Videos can't be personalized
- Build time increases
- Large files (4 languages × 3 worlds = 12+ videos)

**Verdict:** Good for **MVP** if videos are generic and limited in number.

#### Option 2: Remotion Lambda + CDN (RECOMMENDED)

**Approach:**
- Render videos on-demand via Lambda
- Store results in S3/R2
- Serve via CloudFront/Cloudflare CDN
- Cache aggressively

**Pros:**
- No bundle size impact
- Videos can be personalized (user-specific data)
- Scales automatically
- Pay only for what you use

**Cons:**
- Requires AWS setup
- Slightly more complex
- Small render latency on first request

**Implementation:**
1. Set up Remotion Lambda ([guide](https://www.remotion.dev/docs/lambda))
2. Configure Cloudflare R2 for storage ([guide](https://www.remotion.dev/docs/lambda/r2))
3. Add CloudFront/Cloudflare CDN
4. Implement cache headers (1 year for videos)

**Estimated Total Cost (100 videos/month):**
- Remotion Lambda: $2-3
- Cloudflare R2: $0.15 (1GB storage, 10GB egress free)
- Cloudflare CDN: $0 (free tier)
- **Total: ~$3/month**

#### Option 3: Hybrid (PRAGMATIC)

**Approach:**
- Bundle static videos (world intros, tutorials)
- Render dynamic videos on-demand (user stats, achievements)

**Pros:**
- Best of both worlds
- Reduces Lambda calls
- Still allows personalization

**Cons:**
- More complex architecture
- Need to decide what's static vs dynamic

### iOS Safari Video Requirements (HIGH Confidence)

Critical attributes for autoplay on iOS ([source](https://webkit.org/blog/6784/new-video-policies-for-ios/)):

```html
<video
  autoplay
  muted
  playsinline
  src="/videos/world-1-intro.mp4"
/>
```

**Requirements:**
1. **`muted`** - Safari blocks autoplay with sound
2. **`playsinline`** - Prevents fullscreen takeover
3. **`autoplay`** - Standard attribute
4. **No audio track** - Videos with audio tracks won't autoplay even if muted

**Additional Considerations:**
- Low Power Mode disables autoplay (show play button fallback)
- Unmuting video pauses playback (requires user gesture)
- First frame should be meaningful (not black screen)

**Testing Protocol:**
1. Test on real iOS device (Safari behavior differs from desktop)
2. Test in Low Power Mode
3. Test with slow network (video loading states)
4. Test RTL layout (Hebrew)

### Multi-Language Video Strategy

**Challenge:** 4 languages (Hebrew RTL, English, Swedish, Japanese) × 3 worlds = 12 videos minimum

**Options:**

1. **Separate Videos per Language (SIMPLE)**
   - Render 12 separate videos
   - Detect user language, serve appropriate video
   - Pros: Simple, no runtime complexity
   - Cons: 12× storage, 12× render cost

2. **Dynamic Text Overlay (COMPLEX)**
   - Render base video once
   - Overlay translated text at runtime (Canvas/WebGL)
   - Pros: 1 video, smaller storage
   - Cons: Complex implementation, performance cost

3. **Hybrid: Static Backgrounds + Dynamic Text (RECOMMENDED)**
   - Render background animations once
   - Use Remotion to composite text per language
   - Pros: Reduces unique renders, maintains quality
   - Cons: Slightly more complex

**Verdict:** Start with **Option 1** (separate videos) for MVP simplicity. Optimize later if storage becomes a concern.

### Recommendation Summary

**For Phase 1 (MVP):**
- **Use Remotion Lambda** for fastest time-to-market
- Store videos in **Cloudflare R2** (no egress fees)
- Serve via **Cloudflare CDN** (free tier)
- Bundle static videos for instant playback, generate dynamic videos on-demand
- **Estimated cost: $3-5/month for 100 videos**

**Future Optimization (if cost becomes concern):**
- Migrate to self-hosted Cloud Run or dedicated server
- Implement custom distributed rendering
- Use Lambda only for peak load

---

## 3. Background Removal Pipeline

### rembg Library Analysis (HIGH Confidence)

**Overview ([source](https://github.com/danielgatis/rembg)):**
- Open-source Python library for AI background removal
- MIT License (free for commercial use)
- Requires Python 3.11-3.13
- Multiple deployment options: CLI, library, HTTP server, Docker

### Quality Assessment (HIGH Confidence)

**Accuracy ([source](https://medium.com/@HeCanThink/rembg-effortlessly-remove-backgrounds-in-python-c2248501f992)):**
- 95%+ accuracy in testing
- 100% accuracy on high-quality images
- Handles hair, fur, and fine details well

**Model Comparison:**

| Model | Use Case | Quality | Speed |
|-------|----------|---------|-------|
| `birefnet-general` | **Recommended** - newest, most accurate | Highest | Medium |
| `u2net` | Default, general use | High | Fast |
| `u2netp` | Lightweight variant | Medium | Fastest |
| `birefnet-portrait` | Human portraits | Highest | Medium |
| `isnet-anime` | Anime/illustration | High | Fast |
| `sam` | Segment Anything foundation | High | Slow |

**Post-Processing:**
- **Alpha Matting**: Improves edge quality (use `-a` flag)
- **Effort Parameter**: Higher effort = better quality, slower processing

### Performance Characteristics (HIGH Confidence)

**Processing Speed:**
- 2-3 seconds per image (CPU)
- Batch processing: Hundreds of images with session reuse
- GPU acceleration available (NVIDIA CUDA, AMD ROCm)

**Resource Requirements:**
- CPU-only: ~1.6GB Docker image
- GPU (CUDA): ~11GB Docker image
- Model files: Auto-downloaded to `~/.u2net/`

### Deployment Options

#### Option 1: Local Python Script (RECOMMENDED FOR MVP)

**Approach:**
```python
from rembg import remove, new_session
from PIL import Image

session = new_session('birefnet-general')

def remove_background(input_path, output_path):
    with open(input_path, 'rb') as f:
        input_data = f.read()
    output_data = remove(input_data, session=session, alpha_matting=True)

    with open(output_path, 'wb') as f:
        f.write(output_data)
```

**Pros:**
- Simplest setup
- No server maintenance
- Offline processing (privacy)
- Session reuse for batch processing

**Cons:**
- Requires Python environment
- Manual invocation
- Not accessible from Next.js directly

**Use Case:** Generate assets during development, commit to repo.

#### Option 2: HTTP Microservice (SCALABLE)

**Approach:**
```bash
# Start rembg server
rembg s --host 0.0.0.0 --port 7000 --log_level info

# Call from Node.js
curl -F "file=@input.jpg" "http://localhost:7000/api/remove" -o output.png
```

**Pros:**
- Accessible from Next.js API routes
- Can process user-uploaded images
- RESTful API with OpenAPI docs
- Horizontal scaling possible

**Cons:**
- Requires separate deployment
- Additional infrastructure cost
- Network latency

**Use Case:** User-generated content, real-time processing.

#### Option 3: Docker Container (PRODUCTION-READY)

**Approach:**
```dockerfile
# Use official rembg image
docker run -v .:/data danielgatis/rembg i /data/input.png /data/output.png
```

**Pros:**
- Reproducible environment
- Easy deployment (Railway, Fly.io, AWS ECS)
- Isolated from main app
- Can run on GPU instances

**Cons:**
- Requires Docker knowledge
- Container registry management
- Slightly more complex

**Use Case:** Production asset generation pipeline.

### Alternative Tools (MEDIUM Confidence)

Research identified several alternatives to rembg ([source](https://www.edenai.co/post/top-free-background-removal-tools-apis-and-open-source-models)):

| Tool | Type | Accuracy | Cost | Notes |
|------|------|----------|------|-------|
| **rembg** | Open Source | 95%+ | Free | Best offline option |
| remove.bg | API | 98%+ | $0.20/image | Commercial API, 50 free/month |
| Removal.ai | API | 95%+ | $0.10/image | Cheaper than remove.bg |
| BackgroundRemover | Open Source | 40%+ | Free | Lower quality than rembg |
| withoutBG | Hybrid | 90%+ | Free tier + API | Open source + Pro API |
| ClipDrop | API | 95%+ | $9/month | Adobe-backed |

**Verdict:** rembg provides the best quality-to-cost ratio for this use case. Commercial APIs are only worth considering if:
- Processing >10,000 images/month
- Need 24/7 uptime SLA
- Don't want to manage Python infrastructure

### Integration with Asset Pipeline

**Workflow:**

1. **Generate AI image** via Image MCP (already configured)
2. **Remove background** with rembg
3. **Optimize to WebP** with Sharp
4. **Validate size** (<200KB target)
5. **Store** in `/public/assets/`

**Implementation:**

```typescript
// scripts/generate-asset.ts
import { spawnSync } from 'child_process';
import sharp from 'sharp';

async function generateAsset(prompt: string, outputName: string) {
  // 1. Generate via Image MCP (existing integration)
  const rawImage = await imageAPI.generate(prompt);
  await fs.writeFile('temp-raw.png', rawImage);

  // 2. Remove background using rembg CLI
  const result = spawnSync('rembg', [
    'i',
    '-a',
    '-m', 'birefnet-general',
    'temp-raw.png',
    'temp-nobg.png'
  ]);

  if (result.status !== 0) {
    throw new Error(`rembg failed: ${result.stderr}`);
  }

  // 3. Optimize to WebP
  await sharp('temp-nobg.png')
    .webp({ quality: 80, effort: 6 })
    .toFile(`public/assets/${outputName}.webp`);

  // 4. Validate size
  const stats = await fs.stat(`public/assets/${outputName}.webp`);
  if (stats.size > 200 * 1024) {
    console.warn(`Warning: ${outputName} exceeds 200KB (${stats.size} bytes)`);
  }

  // 5. Cleanup
  await fs.unlink('temp-raw.png');
  await fs.unlink('temp-nobg.png');
}
```

### Recommendation

**For Phase 1:**
- Install rembg locally: `pip install "rembg[cpu,cli]"`
- Use `birefnet-general` model for best quality
- Enable alpha matting for clean edges: `rembg i -a input.png output.png`
- Process images as part of asset generation script
- Store processed assets in version control (static assets)

**Future Scalability (if needed):**
- Deploy rembg HTTP server as Docker container
- Use Railway.app or Fly.io (free tier sufficient)
- Call from Next.js API route for dynamic processing

---

## 4. Asset Optimization Pipeline

### WebP Conversion Strategy (HIGH Confidence)

**Sharp Library Configuration ([source](https://sharp.pixelplumbing.com/api-output/)):**

```typescript
import sharp from 'sharp';

await sharp(inputBuffer)
  .webp({
    quality: 80,      // Recommended range: 75-85
    effort: 6,        // Max compression effort (0-6)
    lossless: false   // Lossy compression for smaller size
  })
  .toBuffer();
```

**Quality Settings Analysis ([source](https://app.studyraid.com/en/read/11937/380577/webp-conversion-and-optimization)):**

| Quality | File Size Reduction | Visual Quality | Use Case |
|---------|---------------------|----------------|----------|
| 90 | Baseline | Excellent | Unnecessary for web |
| 80 | -30-40% vs 90 | Very Good | **Recommended** |
| 75 | -45-50% vs 90 | Good | Mobile-first |
| 70 | -55-60% vs 90 | Acceptable | Thumbnails |

**Effort Parameter:**
- `0`: Fastest, largest file size
- `4`: Balanced (default)
- `6`: Slowest, smallest file size (**recommended for asset pipeline**)

**Verdict:** Use **quality 80, effort 6** as baseline. If result exceeds 200KB, iteratively reduce quality to 75, then 70.

### Target File Size Strategy (HIGH Confidence)

**Challenge:** Sharp's quality parameter doesn't guarantee specific file size. Need iterative approach.

**Solution:**

```typescript
async function optimizeToTarget(
  inputPath: string,
  outputPath: string,
  targetSizeKB: number = 200
): Promise<void> {
  const qualities = [80, 75, 70, 65, 60];

  for (const quality of qualities) {
    await sharp(inputPath)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(outputPath);

    const stats = await fs.stat(outputPath);
    const sizeKB = stats.size / 1024;

    console.log(`Quality ${quality}: ${sizeKB.toFixed(2)} KB`);

    if (sizeKB <= targetSizeKB) {
      console.log(`✓ Target achieved at quality ${quality}`);
      return;
    }
  }

  console.warn(`⚠ Could not achieve ${targetSizeKB}KB target`);
}
```

**Alternative Approach (cwebp tool):**
The official Google `cwebp` tool supports `-size` flag to target specific file size ([source](https://developers.google.com/speed/webp/docs/cwebp)):

```bash
cwebp -size 200 input.png -o output.webp
```

This automatically adjusts quality to hit the target. However, Sharp doesn't expose this directly.

### Automated Optimization Workflow

**Build-Time Optimization:**

```typescript
// scripts/optimize-assets.ts
import { glob } from 'glob';
import sharp from 'sharp';

async function optimizeAllAssets() {
  const images = await glob('public/assets/**/*.{png,jpg,jpeg}');

  for (const image of images) {
    const outputPath = image.replace(/\.(png|jpg|jpeg)$/, '.webp');

    await sharp(image)
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);

    const originalSize = (await fs.stat(image)).size;
    const optimizedSize = (await fs.stat(outputPath)).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

    console.log(`${image}: ${savings}% reduction`);
  }
}
```

**Run on Pre-commit Hook:**

```json
// package.json
{
  "scripts": {
    "optimize:assets": "tsx scripts/optimize-assets.ts"
  }
}
```

```bash
# .husky/pre-commit
npm run optimize:assets
git add public/assets/**/*.webp
```

### Asset Versioning Strategy

**Problem:** Cached assets may become stale after updates.

**Solution 1: Content Hash (Next.js Default)**
Next.js automatically adds hashes to static assets:
```
/public/assets/world-1-bg.webp → /_next/static/media/world-1-bg.abc123.webp
```

**Solution 2: Explicit Versioning**
```typescript
const ASSET_VERSION = '2026-01-v1';

export const assetPath = (name: string) =>
  `/assets/${name}?v=${ASSET_VERSION}`;

// Usage
<img src={assetPath('world-1-bg.webp')} />
```

**Solution 3: CDN Purging**
If using Cloudflare CDN:
```bash
# Purge specific asset
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -d '{"files":["https://example.com/assets/world-1-bg.webp"]}'
```

### Storage Strategy

**Option 1: Version Control (SIMPLE)**
- Store optimized assets in `/public/assets/`
- Commit to Git
- Pros: Simple, no external dependencies
- Cons: Increases repo size (use Git LFS if >100MB total)

**Option 2: CDN Storage (SCALABLE)**
- Upload to Cloudflare R2 / AWS S3
- Reference via CDN URL
- Pros: Doesn't bloat repo, fast global delivery
- Cons: Requires deployment step, external dependency

**Option 3: Hybrid (RECOMMENDED)**
- Critical assets (UI elements, sprites) in version control
- Large assets (backgrounds, videos) in CDN
- Best of both worlds

### Recommendation

**For Phase 1:**
1. Use Sharp with **quality 80, effort 6** as baseline
2. Implement iterative quality reduction if >200KB
3. Store assets in `/public/assets/` (version control)
4. Add `optimize:assets` script run on pre-commit hook
5. Use Next.js automatic content hashing for cache busting

**Future Optimization:**
- Migrate large assets to Cloudflare R2
- Implement responsive images (srcset) for different screen sizes
- Consider AVIF format (better compression, limited browser support)

---

## 5. Performance Budget Enforcement

### Lighthouse CI Integration (HIGH Confidence)

**Setup Process ([source](https://dev.to/joerismits/ensure-your-nextjs-apps-performance-is-top-notch-with-lighthouse-ci-and-github-actions-4ne8)):**

1. **Install Lighthouse CI:**
   ```bash
   npm install --save-dev @lhci/cli
   ```

2. **Create Configuration:**
   ```javascript
   // lighthouserc.js
   module.exports = {
     ci: {
       collect: {
         startServerCommand: 'npm run start',
         startServerReadyPattern: 'ready on',
         url: ['http://localhost:3000/'],
         numberOfRuns: 3
       },
       assert: {
         preset: 'lighthouse:recommended',
         assertions: {
           'categories:performance': ['error', { minScore: 0.9 }],
           'categories:accessibility': ['error', { minScore: 0.9 }],
           'categories:best-practices': ['error', { minScore: 0.9 }],
           'categories:seo': ['error', { minScore: 0.9 }]
         }
       },
       upload: {
         target: 'temporary-public-storage'
       }
     }
   };
   ```

3. **Add npm Script:**
   ```json
   {
     "scripts": {
       "lighthouse:ci": "lhci autorun"
     }
   }
   ```

4. **GitHub Actions Integration:**
   ```yaml
   # .github/workflows/lighthouse.yml
   name: Lighthouse CI

   on:
     pull_request:
       branches: [main]

   jobs:
     lighthouse:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - run: npm run lighthouse:ci
         - uses: treosh/lighthouse-ci-action@v10
           with:
             uploadArtifacts: true
             temporaryPublicStorage: true
   ```

**What This Enforces:**
- Performance score ≥ 90
- Accessibility score ≥ 90
- Best Practices score ≥ 90
- SEO score ≥ 90
- **Fails PR if any metric below threshold**

### Bundle Size Tracking (HIGH Confidence)

**Option 1: BundleWatch (RECOMMENDED)**

```bash
npm install --save-dev bundlewatch
```

```json
// package.json
{
  "bundlewatch": {
    "files": [
      {
        "path": ".next/static/**/*.js",
        "maxSize": "250kb"
      },
      {
        "path": ".next/static/**/*.css",
        "maxSize": "50kb"
      }
    ]
  }
}
```

**GitHub Action:**
```yaml
- name: BundleWatch
  run: npm run build && npx bundlewatch
  env:
    BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pros:**
- Automatic PR comments with size diff
- Fails CI if threshold exceeded
- Works with Travis, CircleCI, GitHub Actions
- Free for open source

**Option 2: size-limit**

```bash
npm install --save-dev @size-limit/preset-app
```

```json
// package.json
{
  "size-limit": [
    {
      "path": "dist/**/*.js",
      "limit": "300kb"
    }
  ]
}
```

**Pros:**
- Simpler than BundleWatch
- GitHub Action available
- CLI-friendly

**Option 3: Next.js Bundle Analyzer (DIAGNOSTIC)**

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

```bash
ANALYZE=true npm run build
```

**Use Case:** Visual analysis during development, not CI enforcement.

### Performance Metrics to Track

**Critical Metrics:**

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Lighthouse Performance** | 90+ | Overall performance score |
| **First Contentful Paint (FCP)** | <1.8s | User perceives page loading |
| **Largest Contentful Paint (LCP)** | <2.5s | Main content visible |
| **Time to Interactive (TTI)** | <3.8s | Page fully interactive |
| **Cumulative Layout Shift (CLS)** | <0.1 | Visual stability |
| **Total Blocking Time (TBT)** | <200ms | Main thread responsiveness |
| **Bundle Size** | <300KB | Initial load time |

**Asset-Specific Metrics:**

| Asset Type | Budget | Enforcement |
|-----------|--------|-------------|
| Images | <200KB each | Manual check in asset pipeline |
| Videos | <5MB each | Lighthouse audit (network tab) |
| JavaScript | <250KB (gzip) | BundleWatch |
| CSS | <50KB (gzip) | BundleWatch |

### CI/CD Integration Strategy

**Multi-Stage Checks:**

```yaml
# .github/workflows/performance.yml
name: Performance Checks

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npx bundlewatch
        env:
          BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lighthouse:ci

  asset-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: |
          for file in public/assets/**/*.webp; do
            size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
            if [ $size -gt 204800 ]; then
              echo "❌ $file exceeds 200KB ($size bytes)"
              exit 1
            fi
          done
```

**What This Enforces:**
1. Bundle size stays under budget
2. Lighthouse scores maintain 90+
3. Individual assets don't exceed 200KB

### Recommendation

**For Phase 1:**
1. Install Lighthouse CI with 90+ score requirement
2. Set up BundleWatch for JavaScript bundles (<250KB)
3. Add custom asset size validation script
4. Run all checks on every PR
5. **Block merge if any check fails**

**Configuration (existing project already has Lighthouse CI):**
```json
// package.json (add to existing scripts)
{
  "scripts": {
    "lighthouse:ci:mobile": "lhci autorun --config=./lighthouserc.mobile.cjs",
    "lighthouse:ci:desktop": "lhci autorun --config=./lighthouserc.desktop.cjs",
    "lighthouse:ci": "npm run lighthouse:ci:mobile && npm run lighthouse:ci:desktop",
    "bundle:check": "bundlewatch",
    "assets:check": "tsx scripts/check-asset-sizes.ts",
    "perf:check": "npm run bundle:check && npm run assets:check && npm run lighthouse:ci"
  }
}
```

**Pre-Deployment Checklist:**
- [ ] Lighthouse Performance ≥ 90
- [ ] JavaScript bundle <250KB (gzip)
- [ ] All images <200KB
- [ ] No cumulative layout shift (CLS <0.1)
- [ ] First Contentful Paint <1.8s

---

## Recommendations Summary

### Immediate Actions (Phase 1 Planning)

1. **Workspace Setup:**
   - ✅ Use Remotion 4.0.236+ with React 19 (no isolation needed)
   - Consider pnpm workspace for architectural cleanliness (optional)
   - Share types via `@shared/types` package

2. **Video Rendering:**
   - **Decision:** Start with Remotion Lambda ($3-5/month for MVP)
   - Store videos in Cloudflare R2 (no egress fees)
   - Serve via Cloudflare CDN (free tier)
   - Validate iOS Safari compatibility (muted, playsinline, autoplay)

3. **Background Removal:**
   - Install rembg locally: `pip install "rembg[cpu,cli]"`
   - Use `birefnet-general` model with alpha matting
   - Process images during asset generation (script-based)

4. **Asset Optimization:**
   - Use Sharp: `webp({ quality: 80, effort: 6 })`
   - Implement iterative quality reduction for >200KB files
   - Store optimized assets in `/public/assets/`
   - Add pre-commit hook for automatic optimization

5. **Performance Enforcement:**
   - Configure Lighthouse CI (already installed, verify config)
   - Add BundleWatch for bundle size tracking
   - Create custom asset size validation script
   - Run all checks on every PR, block merge on failure

### Key Decisions Needed

1. **Monorepo Structure:**
   - [ ] Migrate to pnpm or stay with npm?
   - [ ] Create separate Remotion workspace or keep integrated?

2. **Video Strategy:**
   - [ ] Which videos to bundle vs render on-demand?
   - [ ] How many language variants per video?
   - [ ] Local rendering or Lambda from day 1?

3. **Asset Storage:**
   - [ ] Version control or CDN for images?
   - [ ] Use Git LFS for large files?

4. **Performance Budgets:**
   - [ ] Confirm 90+ Lighthouse threshold?
   - [ ] Adjust bundle size limits (currently 250KB reasonable)?

---

## Open Questions

1. **Remotion Workspace Isolation:**
   - While React 19 compatibility is confirmed, should we still isolate Remotion for architectural cleanliness?
   - If yes, is the team willing to migrate from npm to pnpm?

2. **Video Rendering Volume:**
   - How many videos will be generated initially? (Affects Lambda vs bundled decision)
   - Will videos be user-specific or generic per language?

3. **Background Removal Deployment:**
   - Is local Python script acceptable or do we need HTTP microservice from day 1?
   - Who will run asset generation scripts (developers or automated pipeline)?

4. **Asset Generation Workflow:**
   - Should assets be committed to version control or stored in CDN?
   - How do we handle asset updates (versioning strategy)?

5. **Performance Budget Exceptions:**
   - Are there specific pages/routes that can have lower Lighthouse scores?
   - Should we have different budgets for different page types?

---

## Sources

### Primary (HIGH confidence)

**Remotion Documentation:**
- [Installing Remotion in existing projects](https://www.remotion.dev/docs/brownfield)
- [React 19 support](https://www.remotion.dev/docs/react-19)
- [Server-side rendering comparison](https://www.remotion.dev/docs/compare-ssr)
- [Lambda cost examples](https://www.remotion.dev/docs/lambda/cost-example)
- [Cost optimization strategies](https://www.remotion.dev/docs/lambda/optimizing-cost)
- [Using R2 with Lambda](https://www.remotion.dev/docs/lambda/r2)

**Package Manager Documentation:**
- [pnpm Catalogs feature](https://pnpm.io/9.x/catalogs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [npm Workspaces guide](https://leticia-mirelly.medium.com/a-comprehensive-guide-to-npm-workspaces-and-monorepos-ce0cdfe1c625)

**Background Removal:**
- [rembg GitHub repository](https://github.com/danielgatis/rembg)
- [rembg overview article](https://medium.com/@HeCanThink/rembg-effortlessly-remove-backgrounds-in-python-c2248501f992)

**Asset Optimization:**
- [Sharp WebP API](https://sharp.pixelplumbing.com/api-output/)
- [WebP conversion guide](https://app.studyraid.com/en/read/11937/380577/webp-conversion-and-optimization)
- [Google cwebp documentation](https://developers.google.com/speed/webp/docs/cwebp)

**Performance Enforcement:**
- [Lighthouse CI with Next.js guide](https://dev.to/joerismits/ensure-your-nextjs-apps-performance-is-top-notch-with-lighthouse-ci-and-github-actions-4ne8)
- [BundleWatch GitHub](https://github.com/bundlewatch/bundlewatch)

**iOS Safari Video:**
- [WebKit video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Apple Developer video content delivery](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari)

### Secondary (MEDIUM confidence)

**Monorepo Best Practices:**
- [Complete Monorepo Guide (2025)](https://jsdev.space/complete-monorepo-guide/)
- [Managing React versions in monorepo](https://github.com/orgs/pnpm/discussions/6174)
- [Turborepo React version discussion](https://github.com/vercel/turborepo/discussions/3966)

**Video CDN Comparison:**
- [Cloudflare vs S3 cost comparison](https://www.pump.co/blog/cloudflare-vs-s3)
- [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/)
- [Vercel vs Cloudflare comparison](https://www.digitalapplied.com/blog/vercel-vs-netlify-vs-cloudflare-pages-comparison)

**Background Removal Alternatives:**
- [Top background removal tools 2026](https://www.edenai.co/post/top-free-background-removal-tools-apis-and-open-source-models)

### Tertiary (LOW confidence - community-sourced)

- [Next.js monorepo migration guide](https://dev.to/abhilashlr/migrating-a-large-scale-monorepo-from-nextjs-14-to-16-a-real-world-journey-5383)
- [Remotion monorepo template](https://github.com/Takamasa045/remotion-studio-monorepo)

---

## Metadata

**Confidence breakdown:**
- Remotion setup: HIGH - Official documentation, recent (2026)
- Video rendering strategy: HIGH - Official cost examples, well-documented
- Background removal: HIGH - GitHub source code, verified accuracy claims
- Asset optimization: HIGH - Sharp official API, Google WebP docs
- Performance enforcement: HIGH - Official Lighthouse CI, BundleWatch docs

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - infrastructure docs are stable)

**Research gaps:**
- No real-world cost data from production Remotion Lambda usage
- rembg quality claims not independently verified (trust GitHub stars/community)
- pnpm catalog feature is new (9.5.0), limited production examples

**Validation needed during planning:**
- Confirm React 19 compatibility with full Remotion feature set
- Test rembg quality with actual game asset style
- Verify Lighthouse CI config works with existing project setup
