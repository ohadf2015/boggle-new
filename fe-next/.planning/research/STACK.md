# Stack Research: Video Creation & AI Image Generation

**Project:** LexiClash Adventure Mode Enhancement
**Researched:** 2026-01-22
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

For adding video cutscenes and AI-generated game art to LexiClash, the recommended stack is:

1. **Video Creation**: Remotion 4.0+ with React 19 (via workaround) + Remotion Lambda for rendering
2. **AI Image Generation**: Flux 2 Dev API (primary) + Leonardo AI (character consistency fallback)
3. **Background Removal**: rembg with BRIA RMBG-2.0 model (Python microservice)

**Critical Finding**: Remotion does NOT officially support React 19 yet as of Jan 2026, which conflicts with LexiClash's Next.js 16 + React 19.2 stack. Two options:
- **Option A**: Keep Remotion components isolated in a separate React 18 context (recommended)
- **Option B**: Wait for official React 19 support (timeline unclear)

---

## Video Creation (Remotion)

### Recommended Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `remotion` | **4.0.407** | Video framework | Current stable, React-based, programmatic video |
| `@remotion/cli` | **4.0.407** | Development tools | Preview/render locally |
| `@remotion/player` | **4.0.407** | Embed videos in React | Show cutscenes in-game |
| `@remotion/lambda` | **4.0.407** | Serverless rendering | Fast distributed rendering on AWS |
| React | **18.3+** (for now) | UI framework | Required by Remotion (React 19 support pending) |

**Confidence:** HIGH (versions verified from [npm](https://www.npmjs.com/package/remotion) and [official docs](https://www.remotion.dev/docs/version))

### Installation

```bash
# Core packages
npm install remotion@4.0.407 @remotion/cli@4.0.407

# For embedding videos in Next.js
npm install @remotion/player@4.0.407

# For serverless rendering
npm install @remotion/lambda@4.0.407
```

### Integration with Next.js 16 + React 19

**⚠️ CRITICAL COMPATIBILITY ISSUE**

As of January 2026, [Remotion does NOT support React 19](https://www.remotion.dev/docs/react-19), while LexiClash uses Next.js 16 with React 19.2.

**Recommended Approach: Isolated Remotion Context**

Create a separate folder (`remotion/`) with its own React 18 context:

```
fe-next/
├── app/                    # Next.js 16 + React 19
├── components/             # Next.js 16 + React 19
├── remotion/               # Remotion + React 18 (isolated)
│   ├── compositions/       # Video compositions
│   │   ├── LevelIntro.tsx
│   │   ├── WorldTransition.tsx
│   │   └── Tutorial.tsx
│   ├── Root.tsx           # registerRoot()
│   └── package.json       # Separate React 18 deps
└── package.json           # Main React 19 deps
```

**Why This Works:**
- Remotion rendering happens **server-side** (doesn't interact with client React 19)
- `@remotion/player` can embed pre-rendered videos in Next.js without version conflicts
- Videos are built separately via `remotion render` CLI

**Trade-off:** Slight complexity managing two React versions, but cleanly isolates concerns.

### Rendering Options

| Option | Speed | Cost | Use Case |
|--------|-------|------|----------|
| **Remotion Lambda** | ⚡ Fastest (parallel) | $0.01-0.05/min | Production cutscenes |
| Local Rendering | 🐌 Slower (serial) | Free (dev machine) | Development/testing |
| CI/CD Rendering | ⚖️ Medium | Free (GitHub Actions) | Build-time generation |

**Recommendation:** Use Remotion Lambda for production.

**Why:**
- [Distributed rendering](https://www.remotion.dev/docs/compare-ssr) renders frames in parallel (up to 200 concurrent Lambdas)
- Most users render "multiple minutes of video for just a few pennies" ([cost example](https://www.remotion.dev/docs/lambda/cost-example))
- Avoids Vercel function size limits (headless browser doesn't fit in Vercel serverless functions) ([Next.js limitation](https://www.remotion.dev/docs/miscellaneous/nextjs))

**Cost Estimate:**
- 30-second cutscene @ 30fps = 900 frames
- Lambda rendering: ~$0.02-0.03 per video
- Storage (S3): negligible
- Monthly estimate for 50 cutscenes: ~$1-2

**Confidence:** HIGH (verified from [official Lambda docs](https://www.remotion.dev/docs/lambda) and [cost calculator](https://www.remotion.dev/docs/lambda/cost-example))

### Deployment Considerations

**❌ Cannot Deploy to Vercel:**
- Remotion requires headless browser (Chromium)
- Vercel function size limit prevents bundling renderer
- [Official docs recommend](https://www.remotion.dev/docs/miscellaneous/nextjs) Remotion Lambda for Next.js deployments

**✅ Recommended Architecture:**
1. **Local Development:** Use `npx remotion preview` for live editing
2. **Build Time:** Pre-render videos during CI/CD, store in public folder or CDN
3. **Runtime Generation:** Use Remotion Lambda for dynamic videos (e.g., personalized level intros)

---

## AI Image Generation

### Recommended Primary: Flux 2 Dev API

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Flux 2 Dev** | Latest (API) | Game backgrounds, tiles, UI | Open-weight, best quality/price, fine-tunable |
| Replicate API | Latest | Hosting Flux models | Easy API access, pay-per-use |

**Pricing:**
- ~$0.013 per image ([Replicate pricing](https://replicate.com/replicate/flux-2d-game-assets))
- Specialized [Flux 2D Game Assets](https://replicate.com/replicate/flux-2d-game-assets) model available
- [76 generations per $1](https://replicate.com/replicate/flux-2d-game-assets), completes in ~9 seconds

**Why Flux 2 Dev:**
- **Open-weight:** Can fine-tune on LexiClash style (neo-brutalist, dark theme)
- **Quality/Price:** Best ratio at $0.01-0.02/image ([WaveSpeedAI comparison](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/))
- **Game Assets:** Specialized model exists for 2D game art
- **Commercial Rights:** Full commercial use included ([CometAPI guide](https://www.cometapi.com/how-to-use-flux-2-api/))
- **Consistency:** Can use same seed + style descriptors for cohesive art style

**Installation:**
```bash
npm install replicate
```

**Usage Example:**
```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Generate world background
const output = await replicate.run(
  "replicate/flux-2d-game-assets:latest",
  {
    input: {
      prompt: "neo-brutalist dark fantasy meadow background, bold shadows, flat colors, game asset",
      aspect_ratio: "16:9",
      output_format: "webp",
      output_quality: 80
    }
  }
);
```

**Confidence:** HIGH (verified from [official Flux docs](https://docs.bfl.ai/quick_start/pricing) and [Replicate model page](https://replicate.com/replicate/flux-2d-game-assets))

### Recommended Secondary: Leonardo AI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Leonardo AI API** | Latest (API) | Character consistency (Lexi mascot) | Best character reference features |

**Pricing:**
- API starts at ~$9/month for basic tier ([Leonardo pricing](https://leonardo.ai/pricing/))
- Separate from web subscription
- High-volume scales to hundreds/month
- Note: [Prices increased Q4 2025](https://therightgpt.com/leonardo-ai-guide/pricing/) (Starter: $12-15/mo)

**Why Leonardo for Characters:**
- **Character Reference:** Upload 10-20 Lexi images, trains model for consistency ([character guide](https://leonardo.ai/learn/core-feature/how-to-create-consistent-characters-with-character-reference/))
- **Fine-tuning:** Custom models for specific styles/subjects
- **Game Assets Focus:** Explicitly designed for game art generation
- **Consistency:** Better at maintaining character traits across variations

**Use Case:**
- **Flux 2:** Backgrounds, UI elements, special tiles (gold, ice, bomb)
- **Leonardo AI:** Lexi the cat mascot in different poses/expressions

**Confidence:** MEDIUM-HIGH (verified from [Leonardo API docs](https://leonardo.ai/pricing/) and [character consistency guide](https://leonardo.ai/news/character-consistency-with-leonardo-character-reference-6-examples/))

### Alternative Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| DALL-E 3 | Best text rendering, GPT-4o integration | Expensive ($0.04-0.12/image) | ❌ Too expensive for volume |
| Midjourney | Best aesthetics, photorealism | No API (Discord only), $30/mo min | ❌ No programmatic access |
| Stable Diffusion (local) | Free, full control | Requires GPU, slow, complex setup | ❌ Overhead not worth it |

**Sources:**
- [DALL-E 3 pricing](https://openai.com/api/pricing/): $0.04-0.12/image
- [Midjourney comparison](https://www.creativebloq.com/ai/ai-art/midjourney-vs-dall-e-3-vs-stable-diffusion-which-ai-image-generator-is-best): Best for concept art but no API
- [2026 AI image trends](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/): Flux 2 best value

---

## Background Removal

### Recommended: rembg with BRIA RMBG-2.0

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **rembg** | Latest (Python) | Background removal library | State-of-the-art, GPU support, CLI/API/library |
| **BRIA RMBG-2.0** | Latest (model) | Pre-trained model | Best quality, trained on 15K+ game assets |

**Python Version:** Requires Python 3.11-3.13 ([rembg GitHub](https://github.com/danielgatis/rembg))

**Installation:**
```bash
# For GPU (NVIDIA CUDA)
pip install "rembg[gpu,cli]"

# For CPU (slower but no GPU needed)
pip install "rembg[cpu,cli]"
```

**Why rembg + BRIA RMBG-2.0:**
- **State-of-the-Art:** [BRIA RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0) trained on 15,000 high-res game/stock images
- **Game-Focused:** Training included e-commerce, gaming, advertising content
- **Edge Quality:** Excellent for hair/complex edges (important for Lexi the cat)
- **Flexible Deployment:** CLI, Python library, HTTP server, or Docker ([rembg usage](https://github.com/danielgatis/rembg))
- **GPU Acceleration:** 5-10x faster with CUDA ([BackgroundRemover benchmarks](https://github.com/nadermx/backgroundremover))

**Deployment Options:**

#### Option 1: Python Microservice (Recommended)

Create a lightweight Python API that Next.js calls:

```
fe-next/
└── python-services/
    └── background-removal/
        ├── server.py          # Flask/FastAPI server
        ├── requirements.txt   # rembg[gpu,cli]
        └── Dockerfile         # Deploy to Railway/Fly.io
```

**Server Example (FastAPI):**
```python
from fastapi import FastAPI, UploadFile
from rembg import remove
from PIL import Image
import io

app = FastAPI()

@app.post("/remove-background")
async def remove_bg(file: UploadFile):
    input_image = Image.open(file.file)
    output_image = remove(
        input_image,
        model_name='bria-rmbg-2.0',  # Best quality
        post_process_mask=True       # Clean up edges
    )

    # Return WebP
    img_byte_arr = io.BytesIO()
    output_image.save(img_byte_arr, format='WEBP', quality=80)
    return Response(content=img_byte_arr.getvalue(), media_type="image/webp")
```

**Next.js Integration:**
```typescript
// app/api/process-image/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();

  // Call Python microservice
  const response = await fetch('http://python-service:8000/remove-background', {
    method: 'POST',
    body: formData
  });

  return new Response(await response.blob());
}
```

**Deployment:**
- **Railway/Fly.io:** Deploy Python service separately (~$5-10/month)
- **Docker:** Containerize with GPU support
- **Environment Var:** Set Python service URL in Next.js

**Why Microservice Architecture:**
- Next.js doesn't run Python ([GitHub discussion](https://github.com/vercel/next.js/discussions/15846))
- Python service can have GPU access (rembg needs it for speed)
- Independent scaling (background removal is CPU/GPU heavy)
- Clean separation of concerns

#### Option 2: Serverless Function (Alternative)

Use AWS Lambda with Docker container image:

```dockerfile
FROM public.ecr.aws/lambda/python:3.11
RUN pip install "rembg[cpu,cli]"  # CPU only on Lambda
COPY server.py .
CMD ["server.handler"]
```

**Trade-off:** No GPU on Lambda = slower processing, but zero cost when idle.

**Confidence:** HIGH (verified from [rembg official docs](https://github.com/danielgatis/rembg) and [BRIA model card](https://huggingface.co/briaai/RMBG-2.0))

### Alternative: remove.bg API

| Technology | Pricing | Pros | Cons |
|------------|---------|------|------|
| remove.bg | 50 free/month, then $0.20/image | No setup, API-ready | Expensive at scale |

**Verdict:** ❌ Use only for prototyping. At 1000 images/month, rembg saves $200-195 ($5 hosting vs $200 API).

---

## Integration with Existing Stack

### How These Tools Fit

**Current Stack (LexiClash):**
- Next.js 16 + React 19.2
- Framer Motion for animations
- Supabase + Redis
- Express + Socket.IO backend

**New Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│ Next.js 16 Frontend (React 19)                          │
│ ├── Adventure Mode UI                                   │
│ ├── @remotion/player (embed cutscenes)                  │
│ └── API routes (/api/generate-image, /api/remove-bg)    │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────────┐
│ Remotion     │ │ Flux 2 API  │ │ Python Service   │
│ (React 18)   │ │ (Replicate) │ │ (rembg + BRIA)   │
│              │ │             │ │                  │
│ Compositions │ │ Generate    │ │ Remove BG        │
│ ├─ Intro     │ │ Backgrounds │ │ Clean Assets     │
│ ├─ Tutorial  │ │ Tiles       │ │ GPU Accelerated  │
│ └─ Transit   │ │ Characters  │ │                  │
└──────────────┘ └─────────────┘ └──────────────────┘
        │               │               │
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│ AWS Lambda (Remotion) + CDN (videos/images)             │
│ ├── /videos/intro-meadows.mp4                           │
│ ├── /images/bg-meadows.webp                             │
│ └── /images/lexi-happy.webp                             │
└─────────────────────────────────────────────────────────┘
```

### File Organization

```
fe-next/
├── app/                           # Next.js 16 + React 19
│   ├── api/
│   │   ├── generate-image/        # Calls Replicate API
│   │   └── remove-background/     # Calls Python service
│   └── [locale]/adventure/        # Adventure mode pages
│
├── remotion/                      # Isolated React 18 context
│   ├── compositions/
│   │   ├── LevelIntro.tsx         # 5-10s level intro
│   │   ├── WorldTransition.tsx    # 3-5s world change
│   │   └── Tutorial.tsx           # 30s onboarding
│   ├── assets/                    # Generated backgrounds/chars
│   ├── Root.tsx                   # registerRoot()
│   └── package.json               # React 18 deps
│
├── python-services/
│   └── background-removal/
│       ├── server.py              # FastAPI server
│       ├── requirements.txt       # rembg dependencies
│       └── Dockerfile             # GPU container
│
├── public/
│   ├── videos/                    # Pre-rendered cutscenes
│   └── images/                    # Processed game assets
│
└── scripts/
    ├── generate-adventure-assets.ts  # Bulk generate images
    └── render-cutscenes.ts           # Batch render videos
```

### Development Workflow

**1. Asset Generation (Development):**
```bash
# Generate world backgrounds
npm run generate:backgrounds    # Calls Flux 2 API
npm run clean:backgrounds       # Python service removes BGs
npm run optimize:backgrounds    # Sharp converts to WebP
```

**2. Video Creation (Development):**
```bash
# Preview cutscenes
cd remotion && npx remotion preview

# Render locally (dev)
npx remotion render LevelIntro level-intro.mp4

# Render on Lambda (production)
npx remotion lambda render LevelIntro level-intro.mp4
```

**3. Integration (Runtime):**
```typescript
// app/[locale]/adventure/level/[id]/page.tsx
import { Player } from '@remotion/player';
import LevelIntro from '@/remotion/compositions/LevelIntro';

export default function LevelPage({ params }) {
  return (
    <>
      {/* Show cutscene before level */}
      <Player
        component={LevelIntro}
        durationInFrames={300}  // 10s @ 30fps
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        inputProps={{ worldName: 'Alphabet Meadows' }}
      />

      {/* Game board with AI-generated background */}
      <div style={{ backgroundImage: 'url(/images/bg-meadows.webp)' }}>
        {/* Boggle grid */}
      </div>
    </>
  );
}
```

### Performance Considerations

**Video Optimization:**
- Pre-render cutscenes at build time (store in CDN)
- Use `@remotion/player` lazy loading
- Target 1080p @ 30fps (2MB/10s with H.264)
- WebM format for web (smaller than MP4)

**Image Optimization:**
- WebP format, quality 80 (per project requirements)
- Target <200KB per image (per CLAUDE.md)
- Use Next.js `<Image>` component for lazy loading
- Store in CDN (Cloudflare/Vercel Edge)

**Cost Optimization:**
- Generate assets at build time, not runtime
- Cache background removal results (Redis)
- Use Remotion Lambda for infrequent renders only
- Bulk generate with batch APIs (cheaper)

---

## Not Recommended

### ❌ Avoid These Options

#### 1. **Remotion on Vercel Serverless Functions**
**Why:** Headless browser exceeds Vercel function size limit ([official docs](https://www.remotion.dev/docs/miscellaneous/nextjs))
**Alternative:** Use Remotion Lambda or pre-render at build time

#### 2. **DALL-E 3 for High-Volume Generation**
**Why:** $0.04-0.12/image is 3-10x more expensive than Flux 2
**When to Use:** Only for text-heavy UI elements (DALL-E excels at text rendering)

#### 3. **Midjourney**
**Why:** No API access (Discord-only), can't automate
**When to Use:** Manual concept art only

#### 4. **Local Stable Diffusion**
**Why:** Requires GPU server, complex setup, slow iteration
**When to Use:** Only if already have ML infrastructure

#### 5. **remove.bg API for Production**
**Why:** $0.20/image = $200/1000 images vs $5 hosting for rembg
**When to Use:** Only for prototyping or <50 images/month

#### 6. **FFmpeg-based Video Generation**
**Why:** Manual, no React integration, complex timeline management
**When to Use:** Only for simple slideshow-style videos

#### 7. **After Effects + Automation**
**Why:** Not code-first, expensive licenses, hard to version control
**When to Use:** Only for complex motion graphics beyond Remotion's scope

---

## Licensing Considerations

### Remotion
- **Free Tier:** Unlimited for individuals/small teams (<4 people)
- **Company License:** Required for teams of 4+ ([FAQ](https://www.remotion.dev/docs/lambda/faq))
- **Cost:** Check official pricing (not disclosed publicly)

### Flux 2 Dev
- **Commercial Use:** Included in API pricing ([WaveSpeedAI](https://wavespeed.ai/blog/posts/flux-2-complete-guide-2026/))
- **Generated Images:** Yours to use commercially, no attribution

### Leonardo AI
- **Commercial Use:** Included in paid plans
- **API Pricing:** Separate from web subscription

### BRIA RMBG-2.0
- **Non-Commercial:** Free under CC BY-NC 4.0 ([Hugging Face](https://huggingface.co/briaai/RMBG-2.0))
- **Commercial:** Requires license from BRIA AI
- **Self-Hosted:** Contact BRIA for pricing

**⚠️ IMPORTANT:** For production use with rembg + BRIA model, acquire commercial license from BRIA AI.

**Alternative:** Use U2Net model (fully open source) with rembg if BRIA license is too expensive.

---

## Implementation Timeline

**Phase 1: Setup (Week 1)**
- [ ] Install Remotion 4.0.407 with React 18 isolation
- [ ] Set up Replicate API access (Flux 2)
- [ ] Deploy Python microservice for rembg (Railway/Fly.io)

**Phase 2: Asset Pipeline (Week 2)**
- [ ] Create asset generation scripts (backgrounds, tiles)
- [ ] Integrate background removal workflow
- [ ] Optimize to WebP with Sharp (quality 80, <200KB)

**Phase 3: Video Creation (Week 3)**
- [ ] Build Remotion compositions (LevelIntro, WorldTransition, Tutorial)
- [ ] Set up Remotion Lambda for rendering
- [ ] Integrate `@remotion/player` in Next.js

**Phase 4: Integration (Week 4)**
- [ ] Wire up Adventure Mode with cutscenes
- [ ] Test performance (lazy loading, CDN)
- [ ] Document workflow for future asset additions

---

## Cost Estimate (Monthly)

| Service | Volume | Cost |
|---------|--------|------|
| **Remotion Lambda** | 50 cutscenes/mo | $1-2 |
| **Flux 2 API (Replicate)** | 500 images/mo | $6-10 |
| **Leonardo AI API** | 100 characters/mo | $9 (basic tier) |
| **Python Service (Railway)** | Always-on | $5-10 |
| **CDN (Vercel/Cloudflare)** | 10GB bandwidth | Free (Vercel tier) |
| **Total** | | **~$21-31/month** |

**One-Time Costs:**
- BRIA RMBG commercial license (if needed): Contact BRIA
- Remotion Company License (if team >4): Check official pricing

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| React 19 incompatibility | HIGH | Isolate Remotion in React 18 context |
| Remotion Lambda costs spike | MEDIUM | Set budget alerts, pre-render when possible |
| Python service downtime | MEDIUM | Use serverless function fallback (AWS Lambda) |
| BRIA license cost | LOW | Fall back to U2Net model (fully open source) |
| API rate limits (Replicate) | LOW | Batch generate, cache aggressively |

---

## Sources

**Remotion:**
- [Remotion Official Docs](https://www.remotion.dev/)
- [Remotion npm Package](https://www.npmjs.com/package/remotion)
- [Remotion Lambda Docs](https://www.remotion.dev/docs/lambda)
- [Remotion Next.js Integration](https://www.remotion.dev/docs/miscellaneous/nextjs)
- [Remotion React 19 Status](https://www.remotion.dev/docs/react-19)

**AI Image Generation:**
- [Top 10 Image Generation APIs 2026](https://www.pixazo.ai/blog/top-image-generation-apis)
- [Best AI Image Generators 2026](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/)
- [Flux 2 Complete Guide](https://wavespeed.ai/blog/posts/flux-2-complete-guide-2026/)
- [Flux 2D Game Assets Model](https://replicate.com/replicate/flux-2d-game-assets)
- [Leonardo AI Pricing](https://leonardo.ai/pricing/)
- [Leonardo Character Reference Guide](https://leonardo.ai/learn/core-feature/how-to-create-consistent-characters-with-character-reference/)
- [DALL-E 3 Pricing](https://openai.com/api/pricing/)

**Background Removal:**
- [rembg GitHub Repository](https://github.com/danielgatis/rembg)
- [BRIA RMBG-2.0 Model](https://huggingface.co/briaai/RMBG-2.0)
- [BackgroundRemover GitHub](https://github.com/nadermx/backgroundremover)

**Integration:**
- [Next.js Python Integration Discussion](https://github.com/vercel/next.js/discussions/15846)
- [Remotion SSR Comparison](https://www.remotion.dev/docs/compare-ssr)

---

**Next Steps:** Proceed to roadmap creation with these stack recommendations.
