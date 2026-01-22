# Architecture Research: Video Content & AI-Generated Assets Integration

**Project:** LexiClash
**Researched:** 2026-01-22
**Confidence:** MEDIUM

## Executive Summary

Integrating Remotion for video content and AI-generated images into LexiClash requires a monorepo-style architecture with clear separation between Next.js application, video generation, and asset processing pipelines. The recommended approach uses:

1. **Remotion as a sibling workspace** (not nested inside Next.js)
2. **Build-time video rendering** for static content (cutscenes, tutorials)
3. **CDN delivery** for video assets
4. **Server-side background removal** for AI-generated images
5. **Supabase Storage** for asset hosting

This architecture maintains the existing Next.js structure while adding video generation capabilities without bloating the web application bundle.

---

## Project Structure

### Recommended Monorepo Layout

```
boggle-new/
├── fe-next/                    # Existing Next.js app
│   ├── app/
│   ├── components/
│   ├── public/
│   │   ├── videos/            # Static rendered videos (bundled)
│   │   │   ├── tutorials/
│   │   │   ├── cutscenes/
│   │   │   └── transitions/
│   │   └── images/            # AI-generated assets (processed)
│   │       ├── backgrounds/
│   │       ├── characters/
│   │       └── daily-buzz/
│   ├── backend/
│   └── package.json
│
├── remotion/                   # NEW: Video generation workspace
│   ├── src/
│   │   ├── compositions/
│   │   │   ├── Tutorial.tsx
│   │   │   ├── Cutscene.tsx
│   │   │   └── Transition.tsx
│   │   ├── components/        # Shared video components
│   │   │   ├── AnimatedText.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   └── Logo.tsx
│   │   ├── assets/            # Source assets for videos
│   │   │   ├── fonts/
│   │   │   ├── images/
│   │   │   └── audio/
│   │   └── Root.tsx
│   ├── public/                # Assets bundled by Remotion
│   ├── out/                   # Rendered video output
│   ├── remotion.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/                    # Build orchestration
│   ├── generate-videos.js     # Pre-render videos at build time
│   ├── process-images.js      # AI image pipeline
│   └── upload-assets.js       # Upload to Supabase/CDN
│
├── shared/                     # NEW: Shared code between workspaces
│   ├── types/                 # TypeScript types
│   ├── constants/             # Design tokens, colors
│   └── utils/                 # Shared utilities
│
├── package.json               # Root workspace config
├── pnpm-workspace.yaml        # or npm workspaces
└── turbo.json                 # Optional: Turborepo for builds
```

### Why This Structure?

**Separation of Concerns:**
- Next.js focuses on web application
- Remotion workspace dedicated to video generation
- Shared package prevents code duplication

**Build Independence:**
- Videos render separately from Next.js build
- Failed video render doesn't break web app
- Can render videos in parallel with app build

**Asset Optimization:**
- Static videos in `public/videos/` for bundled delivery
- Large/dynamic assets on CDN (Supabase Storage)
- Clear separation between static and dynamic content

---

## Remotion Integration

### Installation in Monorepo

**Step 1: Create Remotion Workspace**

```bash
cd boggle-new
npx create-video@latest remotion --blank
```

**Step 2: Configure Workspace**

For npm workspaces (`package.json` at root):
```json
{
  "name": "lexiclash-monorepo",
  "private": true,
  "workspaces": [
    "fe-next",
    "remotion",
    "shared"
  ]
}
```

For pnpm:
```yaml
# pnpm-workspace.yaml
packages:
  - 'fe-next'
  - 'remotion'
  - 'shared'
```

**Step 3: Shared Dependencies**

Install shared packages at root:
```bash
npm install -w shared react react-dom typescript zod
```

Remotion and Next.js both use React 19, ensuring compatibility.

### Remotion Configuration

**remotion.config.ts:**
```typescript
import { Config } from '@remotion/cli/config';
import path from 'path';

// Match LexiClash design system
Config.setVideoImageFormat('webp');
Config.setOverwriteOutput(true);

// Output to Next.js public folder
Config.setPublicDir(path.join(__dirname, 'public'));
Config.Output.setOverwriteOutput(true);

// Performance optimizations
Config.setConcurrency(8);
Config.Rendering.setImageFormat('webp');

export default Config;
```

### Design System Integration

**Share Neo-Brutalist Design Tokens:**

`shared/constants/design-tokens.ts`:
```typescript
export const colors = {
  neoYellow: '#FFE135',
  neoOrange: '#FF6B35',
  neoPink: '#FF1493',
  neoCyan: '#00FFFF',
  neoNavy: '#1a1a2e',
  neoWhite: '#FFFFFF',
};

export const fonts = {
  display: 'Fredoka',
  body: 'Rubik',
};

export const shadows = {
  hard: '4px 4px 0px black',
  hardLg: '8px 8px 0px black',
  hardPressed: '2px 2px 0px black',
};
```

**Use in Remotion compositions:**
```typescript
import { colors, shadows } from '@shared/constants/design-tokens';

export const Tutorial: React.FC = () => (
  <AbsoluteFill style={{
    backgroundColor: colors.neoNavy,
    boxShadow: shadows.hard
  }}>
    {/* Video content */}
  </AbsoluteFill>
);
```

**Use in Next.js:**
```typescript
import { colors } from '@shared/constants/design-tokens';

export default function Button() {
  return (
    <button style={{ backgroundColor: colors.neoYellow }}>
      {/* Component */}
    </button>
  );
}
```

### Rendering Strategy

**Two Approaches:**

#### 1. Build-Time Rendering (Recommended for Static Content)

**Use for:**
- Tutorial videos (same for all users)
- Game rule explanations
- Transitions between screens
- Marketing/intro cutscenes

**Script: `scripts/generate-videos.js`**
```javascript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

async function renderVideos() {
  const bundled = await bundle({
    entryPoint: path.join(__dirname, '../remotion/src/Root.tsx'),
    webpackOverride: (config) => config,
  });

  const compositions = ['Tutorial', 'GameIntro', 'Transition'];

  for (const comp of compositions) {
    const composition = await selectComposition({
      serveUrl: bundled,
      id: comp,
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: path.join(
        __dirname,
        `../fe-next/public/videos/${comp.toLowerCase()}.mp4`
      ),
      imageFormat: 'webp',
    });

    console.log(`✅ Rendered: ${comp}`);
  }
}

renderVideos();
```

**Add to Next.js build:**
```json
{
  "scripts": {
    "build": "npm run generate:videos && next build",
    "generate:videos": "node scripts/generate-videos.js"
  }
}
```

#### 2. Runtime Rendering (For Dynamic/Personalized Content)

**Use for:**
- User-specific highlight reels
- Dynamic scoreboard videos
- Personalized achievements

**Implementation:**
```typescript
// fe-next/app/api/render-video/route.ts
import { renderMedia } from '@remotion/renderer';

export async function POST(request: Request) {
  const { compositionId, inputProps } = await request.json();

  const outputPath = `/tmp/video-${Date.now()}.mp4`;

  await renderMedia({
    composition: await selectComposition({
      serveUrl: bundleUrl,
      id: compositionId,
      inputProps,
    }),
    serveUrl: bundleUrl,
    codec: 'h264',
    outputLocation: outputPath,
  });

  // Upload to Supabase Storage
  const { data } = await supabase.storage
    .from('videos')
    .upload(`generated/${outputPath}`, file);

  return Response.json({ url: data.publicUrl });
}
```

**⚠️ Performance Warning:**
Runtime rendering is SLOW (30-60 seconds for 10-second video). Use **Remotion Lambda** for production at scale.

### Remotion Lambda (For Scale)

If you need runtime rendering at scale:

```typescript
import { renderMediaOnLambda } from '@remotion/lambda/client';

const { renderId, bucketName } = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render',
  composition: 'UserHighlights',
  serveUrl: bundleUrl,
  codec: 'h264',
  inputProps: { userId: '123', score: 1000 },
});

// Poll for completion
const result = await getRenderProgress({ renderId, bucketName });
```

**Cost:** ~$0.01-0.05 per video (faster than server rendering).

---

## Asset Pipeline

### AI-Generated Image Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Image Pipeline                         │
└─────────────────────────────────────────────────────────────┘

1. GENERATION (Server-side script or API)
   ├─ Anthropic Claude (DALL-E, Midjourney, etc.)
   ├─ Input: Text prompt (avoid hex codes per CLAUDE.md)
   └─ Output: PNG/JPG (raw, with background)

2. DOWNLOAD & VALIDATION
   ├─ Download to temp folder
   ├─ Validate: File size, dimensions, format
   └─ Check content moderation (if needed)

3. BACKGROUND REMOVAL (Server-side)
   ├─ Use @imgly/background-removal-node (NOT browser version)
   ├─ Process: Remove background, output PNG with transparency
   └─ Why server: Faster, consistent, no CORS issues

4. OPTIMIZATION
   ├─ Resize to target dimensions
   ├─ Convert to WebP (quality 80, effort 6 per CLAUDE.md)
   ├─ Target: <200KB file size
   └─ Use sharp library (already in dependencies)

5. UPLOAD
   ├─ Supabase Storage bucket: 'game-assets'
   ├─ Path: images/backgrounds/, images/characters/, etc.
   └─ Get public URL

6. DATABASE RECORD
   ├─ Store metadata in Supabase
   ├─ Fields: url, category, tags, created_at
   └─ Link to game features (Daily Buzz, themes, etc.)

7. PRELOAD IN NEXT.JS
   ├─ Add to next/image for optimization
   ├─ Preload critical assets in _document.tsx
   └─ Cache with long TTL (31536000 per next.config.mjs)
```

### Implementation: Background Removal

**Server-side script (recommended):**

```javascript
// scripts/process-images.js
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

async function processImage(inputPath, category) {
  // 1. Remove background
  const imageWithoutBg = await removeBackground(inputPath);

  // 2. Optimize with sharp
  const optimized = await sharp(imageWithoutBg)
    .resize(1920, 1080, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();

  // 3. Check file size (re-compress if needed)
  if (optimized.length > 200 * 1024) {
    optimized = await sharp(imageWithoutBg)
      .webp({ quality: 70, effort: 6 })
      .toBuffer();
  }

  // 4. Upload to Supabase
  const filename = `${category}/${Date.now()}.webp`;
  const { data, error } = await supabase.storage
    .from('game-assets')
    .upload(filename, optimized, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 year cache
    });

  if (error) throw error;

  // 5. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('game-assets')
    .getPublicUrl(filename);

  // 6. Save to database
  await supabase.from('game_assets').insert({
    url: publicUrl,
    category,
    file_size: optimized.length,
    dimensions: { width: 1920, height: 1080 },
    created_at: new Date().toISOString(),
  });

  console.log(`✅ Processed: ${publicUrl}`);
  return publicUrl;
}
```

**Why Server-Side Background Removal?**

| Aspect | Client-Side (@imgly/background-removal) | Server-Side (@imgly/background-removal-node) |
|--------|----------------------------------------|---------------------------------------------|
| **Speed** | Slow (depends on user hardware) | Fast (consistent server resources) |
| **CORS** | Requires correct headers | No CORS issues |
| **Build Time** | Adds 5-10MB to bundle | Zero bundle impact |
| **Privacy** | ✅ Processes locally | ⚠️ Uploads to server |
| **Consistency** | ❌ Varies by device | ✅ Consistent results |
| **Use Case** | User-uploaded images in-app | Pre-processing assets for game |

**For LexiClash:** Use **server-side** for Daily Buzz and game assets (consistency, performance). Consider client-side only if allowing user avatar uploads.

### Daily Buzz Image Integration

**Workflow for Daily Buzz:**

```typescript
// scripts/generate-daily-buzz-images.js
async function generateDailyBuzzAssets(trends) {
  for (const trend of trends) {
    // 1. Generate image via AI (Anthropic Claude API)
    const prompt = `Create a vibrant, playful illustration of ${trend.topic}.
      Neo-brutalist style with bold colors and hard shadows.
      No text, no hex codes, family-friendly.`;

    const imageUrl = await generateWithClaude(prompt);

    // 2. Download
    const tempPath = await downloadImage(imageUrl);

    // 3. Process (remove bg + optimize)
    const publicUrl = await processImage(tempPath, 'daily-buzz');

    // 4. Update trend record
    await supabase.from('daily_buzz_trends').update({
      image_url: publicUrl,
    }).eq('id', trend.id);
  }
}
```

**Next.js usage:**

```tsx
import Image from 'next/image';

export default function DailyBuzzCard({ trend }) {
  return (
    <Image
      src={trend.image_url}
      alt={trend.topic} // SEO-friendly per CLAUDE.md
      width={400}
      height={300}
      priority={trend.isFeatured}
      quality={80}
    />
  );
}
```

---

## Video Delivery Strategy

### Decision Matrix

| Strategy | Use Case | Pros | Cons | Recommended For |
|----------|----------|------|------|-----------------|
| **Bundled (public/)** | Small, static videos | Fast load, no external deps | Increases bundle size | Tutorials, transitions (<5MB total) |
| **CDN (Supabase Storage)** | Larger static videos | Reduced bundle, fast delivery | Network dependency | Cutscenes, intros (5-50MB) |
| **Streaming (HLS/DASH)** | Long videos | Adaptive quality, resume | Complex setup | Replays, tournament highlights |
| **On-Demand Render** | Personalized videos | Dynamic content | Slow generation | User highlight reels |

### Recommended Approach for LexiClash

**Small Videos (<2MB) → Bundled in `public/videos/`**

Example: Screen transitions (0.5-1 second loops)

```typescript
// fe-next/components/Transition.tsx
export default function Transition() {
  return (
    <video autoPlay loop muted playsInline>
      <source src="/videos/transition.mp4" type="video/mp4" />
    </video>
  );
}
```

**Medium Videos (2-10MB) → Supabase Storage with Preload**

Example: Tutorial videos, game intros

```typescript
// Preload in layout
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link rel="preload" as="video" href="https://[supabase-url]/videos/tutorial.mp4" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Large/Dynamic Videos → Remotion Lambda + CDN**

Example: User highlight reels, tournament recaps

```typescript
// Generate on-demand, cache result
async function getHighlightReel(userId: string) {
  // Check cache
  const cached = await redis.get(`reel:${userId}`);
  if (cached) return cached;

  // Render with Lambda
  const videoUrl = await renderOnLambda({
    composition: 'HighlightReel',
    inputProps: { userId },
  });

  // Cache for 7 days
  await redis.setex(`reel:${userId}`, 604800, videoUrl);
  return videoUrl;
}
```

### Preloading Strategy

**Critical videos (shown immediately):**
```html
<link rel="preload" as="video" href="/videos/intro.mp4" />
```

**Non-critical videos (lazy load):**
```tsx
import { useEffect, useRef } from 'react';

export default function LazyVideo({ src }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        videoRef.current?.load();
      }
    });

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <video ref={videoRef} preload="none">
      <source src={src} type="video/mp4" />
    </video>
  );
}
```

### Supabase Storage Setup

**Create bucket:**
```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true);

-- Set CORS policy
UPDATE storage.buckets
SET cors_allowed_origins = ARRAY['https://lexiclash.live', 'https://www.lexiclash.live']
WHERE id = 'game-assets';
```

**Upload script:**
```typescript
// scripts/upload-assets.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadVideo(localPath, remotePath) {
  const file = fs.readFileSync(localPath);

  const { data, error } = await supabase.storage
    .from('game-assets')
    .upload(`videos/${remotePath}`, file, {
      contentType: 'video/mp4',
      cacheControl: '31536000', // 1 year
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('game-assets')
    .getPublicUrl(`videos/${remotePath}`);

  console.log(`Uploaded: ${publicUrl}`);
  return publicUrl;
}
```

---

## Build Considerations

### Build Order & Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                     Build Pipeline                           │
└─────────────────────────────────────────────────────────────┘

1. INSTALL DEPENDENCIES (parallel)
   ├─ npm install (root)
   ├─ npm install -w fe-next
   └─ npm install -w remotion

2. BUILD SHARED PACKAGE (required first)
   └─ npm run build -w shared
      └─ Outputs: dist/types, dist/constants

3. GENERATE ASSETS (parallel after shared builds)
   ├─ npm run generate:videos (Remotion renders)
   │  └─ Outputs: fe-next/public/videos/*.mp4
   │
   └─ npm run process:images (Background removal + optimization)
      └─ Outputs: Supabase URLs

4. BUILD NEXT.JS (requires assets from step 3)
   └─ npm run build -w fe-next
      └─ Bundles videos from public/
      └─ Fetches Supabase URLs at build time

5. UPLOAD LARGE ASSETS (optional)
   └─ npm run upload:assets
      └─ Uploads generated videos to CDN
      └─ Updates environment variables

6. START SERVER
   └─ npm run start -w fe-next
```

### Turborepo Configuration (Optional)

For faster builds with caching:

**turbo.json:**
```json
{
  "$schema": "https://turborepo.org/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "out/**"]
    },
    "generate:videos": {
      "dependsOn": ["shared#build"],
      "outputs": ["fe-next/public/videos/**"],
      "cache": false
    },
    "process:images": {
      "outputs": [],
      "cache": false
    }
  }
}
```

**package.json (root):**
```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel"
  }
}
```

### CI/CD Integration (Railway/Vercel)

**Railway Build Command:**
```bash
npm run build:all
```

**package.json:**
```json
{
  "scripts": {
    "build:all": "npm run build -w shared && npm run generate:videos && npm run build -w fe-next"
  }
}
```

**Environment Variables Required:**
```bash
# Remotion Lambda (if using runtime rendering)
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# AI Generation
ANTHROPIC_API_KEY=
```

### Docker Build (if containerizing)

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY fe-next/package*.json ./fe-next/
COPY remotion/package*.json ./remotion/
COPY shared/package*.json ./shared/
RUN npm install

# Build shared
COPY shared ./shared
RUN npm run build -w shared

# Generate videos
COPY remotion ./remotion
RUN npm run generate:videos

# Build Next.js
COPY fe-next ./fe-next
RUN npm run build -w fe-next

# Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/fe-next/.next ./fe-next/.next
COPY --from=builder /app/fe-next/public ./fe-next/public
CMD ["npm", "run", "start", "-w", "fe-next"]
```

### Build Time Estimates

| Task | Time | Cacheable? | Notes |
|------|------|------------|-------|
| Install deps | 30-60s | ✅ | Cache node_modules |
| Build shared | 5-10s | ✅ | TypeScript compilation |
| Generate videos (3 videos, 10s each) | 60-120s | ❌ | CPU-intensive, parallel |
| Process images (10 images) | 30-45s | ❌ | Background removal |
| Build Next.js | 45-90s | ✅ | Incremental builds |
| **Total** | **3-5 minutes** | - | First build (no cache) |
| **Incremental** | **1-2 minutes** | - | With caching |

**Optimization Tips:**
1. **Pre-render videos locally**, commit to repo (faster deployments)
2. **Cache video outputs** in CI (avoid re-rendering unchanged videos)
3. **Use Turborepo** for incremental builds
4. **Separate image processing** from main build (run as cron job)

---

## Component Boundaries

### Clear Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Boundaries                      │
└─────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════╗
║                     NEXT.JS APP                              ║
║  Responsibilities:                                           ║
║  • Web application logic                                     ║
║  • User interaction                                          ║
║  • Real-time game state (Socket.IO)                          ║
║  • Consuming video/image assets                              ║
║  • API routes                                                ║
╚══════════════════════════════════════════════════════════════╝
            │
            │ Imports assets from
            │
            ▼
╔══════════════════════════════════════════════════════════════╗
║                   REMOTION WORKSPACE                         ║
║  Responsibilities:                                           ║
║  • Video composition (React components)                      ║
║  • Animation logic                                           ║
║  • Video rendering                                           ║
║  • Exporting to public/videos or CDN                         ║
╚══════════════════════════════════════════════════════════════╝
            │
            │ Outputs videos to
            │
            ▼
╔══════════════════════════════════════════════════════════════╗
║                    PUBLIC/VIDEOS or CDN                      ║
║  • Static MP4/WebM files                                     ║
║  • Accessed by Next.js <video> tags                          ║
╚══════════════════════════════════════════════════════════════╝

            ┌───────────────────────────┐
            │    SHARED PACKAGE         │
            │  • Design tokens          │
            │  • TypeScript types       │
            │  • Constants              │
            │  • Utilities              │
            └───────────────────────────┘
                 ▲              ▲
                 │              │
          Used by Next.js   Used by Remotion
```

### Communication Flow

**Next.js → Remotion:** NONE (statically imports rendered videos)

**Remotion → Next.js:** Outputs videos to `fe-next/public/videos/` or CDN

**Shared ↔ Both:** Both import design tokens, types, utilities

### Data Flow

**Static Videos (Build Time):**
```
Remotion Composition
  → Bundle with Webpack
  → Render to MP4
  → Output to fe-next/public/videos/
  → Next.js imports via <video src="/videos/tutorial.mp4" />
```

**Dynamic Videos (Runtime):**
```
User Action (Next.js)
  → API Route: /api/render-video
  → Triggers Remotion Lambda
  → Lambda renders video
  → Uploads to Supabase Storage
  → Returns public URL to Next.js
  → Next.js plays video from CDN
```

**AI Images:**
```
Script: generate-daily-buzz-images.js
  → Calls AI API (Anthropic Claude)
  → Downloads image
  → Processes (background removal + optimization)
  → Uploads to Supabase Storage
  → Saves URL to database
  → Next.js fetches URL from database
  → Displays via next/image
```

---

## Anti-Patterns to Avoid

### ❌ Don't Nest Remotion Inside Next.js

**Bad:**
```
fe-next/
  └── remotion/  ❌ Nested (breaks import paths)
```

**Good:**
```
boggle-new/
  ├── fe-next/
  └── remotion/  ✅ Sibling workspaces
```

**Why:** Remotion has its own webpack config that conflicts with Next.js.

### ❌ Don't Bundle Large Videos

**Bad:**
```
public/videos/intro.mp4  (50MB) ❌
```

**Good:**
```
Supabase Storage: videos/intro.mp4 ✅
public/videos/transition.webm (500KB) ✅
```

**Why:** Large files slow down deployment and initial page load.

### ❌ Don't Process Images at Runtime (Client-Side)

**Bad:**
```typescript
// Client-side background removal ❌
const processed = await removeBackground(userImage);
```

**Good:**
```typescript
// Server-side API route ✅
const response = await fetch('/api/process-image', {
  method: 'POST',
  body: formData,
});
```

**Why:** Client-side processing is slow, inconsistent, and adds 5-10MB to bundle.

### ❌ Don't Render Videos on Every Build

**Bad:**
```json
{
  "scripts": {
    "build": "npm run render:all-videos && next build"
  }
}
```

**Good:**
```json
{
  "scripts": {
    "build": "next build",
    "render:videos": "node scripts/generate-videos.js"
  }
}
```

**Why:** Video rendering takes minutes. Only re-render when video content changes.

---

## Performance Optimizations

### Video Optimization

1. **Use WebM for web** (better compression than MP4)
   ```javascript
   Config.setVideoImageFormat('webp');
   Config.setCodec('vp9'); // or 'h264-mkv'
   ```

2. **Generate multiple resolutions**
   ```javascript
   // 1080p for desktop, 720p for mobile
   await renderMedia({ width: 1920, height: 1080 });
   await renderMedia({ width: 1280, height: 720 });
   ```

3. **Preload critical videos**
   ```html
   <link rel="preload" as="video" href="/videos/intro.webm" />
   ```

4. **Lazy load non-critical videos** (see LazyVideo component above)

### Image Optimization

1. **Always use WebP** (per CLAUDE.md: quality 80, effort 6)
2. **Target <200KB** file size
3. **Use next/image** for automatic optimization
4. **Set proper cache headers** (31536000 = 1 year)
5. **Preload hero images**
   ```tsx
   <Image priority src={heroImage} />
   ```

### Build Optimization

1. **Cache Remotion bundle** (reuse across renders)
   ```javascript
   let bundleCache = null;
   async function getBundle() {
     if (!bundleCache) {
       bundleCache = await bundle({ entryPoint: '...' });
     }
     return bundleCache;
   }
   ```

2. **Parallel rendering** (render multiple videos simultaneously)
   ```javascript
   await Promise.all([
     renderMedia({ composition: 'Tutorial' }),
     renderMedia({ composition: 'Intro' }),
   ]);
   ```

3. **Incremental rendering** (only render changed videos)
   ```javascript
   const videosToRender = changedCompositions(); // Check git diff
   for (const comp of videosToRender) {
     await renderMedia({ composition: comp });
   }
   ```

---

## Summary

**Architecture Decisions:**

1. **Monorepo Structure:** Remotion as sibling workspace, not nested
2. **Build Strategy:** Pre-render static videos at build time, use Lambda for dynamic content
3. **Asset Pipeline:** Server-side background removal, WebP optimization, Supabase Storage
4. **Video Delivery:** Small videos bundled, large videos on CDN, dynamic videos on-demand
5. **Shared Code:** Design tokens and types in shared package
6. **Build Order:** Shared → Videos/Images → Next.js

**Phase Structure Recommendations:**

**Phase 1: Foundation**
- Set up monorepo structure
- Create shared package with design tokens
- Configure Remotion workspace

**Phase 2: Static Videos**
- Build tutorial compositions
- Implement build-time rendering
- Add videos to public/ folder

**Phase 3: Asset Pipeline**
- Implement AI image generation script
- Add background removal processing
- Set up Supabase Storage

**Phase 4: Dynamic Content** (if needed)
- Set up Remotion Lambda
- Implement runtime rendering API
- Add caching layer (Redis)

**Phase 5: Optimization**
- Add lazy loading
- Implement preloading strategy
- Optimize build times

---

## Sources

- [Installing Remotion in an existing project](https://www.remotion.dev/docs/brownfield)
- [Remotion and Next.js](https://next.remotion.dev/)
- [Remotion rendering options comparison](https://www.remotion.dev/docs/compare-ssr)
- [@imgly/background-removal](https://www.npmjs.com/package/@imgly/background-removal)
- [@imgly/background-removal-node](https://www.npmjs.com/package/@imgly/background-removal-node)
- [AI Image Transformations in Next.js](https://www.telerik.com/blogs/ai-image-transformations-modern-next-js-applications)
- [CDN Solutions for Game Development](https://www.cachefly.com/news/cdn-solutions-for-reducing-time-to-market-in-game-development/)
- [How CDN Helps Game Developers](https://medium.com/@blazingcdn/how-a-cdn-helps-game-developers-deliver-large-game-files-efficiently-5def2ea481a0)
- [Monorepo Best Practices](https://www.dhiwise.com/post/best-practices-for-structuring-your-react-monorepo)
- [Structuring Your Monorepo](https://www.mindfulchase.com/deep-dives/monorepo-fundamentals-deep-dives-into-unified-codebases/structuring-your-monorepo-best-practices-for-directory-and-code-organization.html)
- [Turborepo: Structuring a Repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
