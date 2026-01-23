# Phase 7: Video Cutscenes - Research

**Researched:** 2026-01-23
**Domain:** Remotion video composition and programmatic video generation
**Confidence:** HIGH

## Summary

Remotion 4.0.381 is the established standard for programmatic React-based video generation, fully compatible with React 19 (already in use by this project) and Next.js. The framework uses a frame-based animation model where React components render individual frames that get compiled into videos. Videos can be pre-rendered to static files OR played at runtime via the `<Player>` component.

For this phase's requirements (5-10s level intros, world transition videos, tutorial video), the research identifies two distinct paths:

1. **Pre-rendered videos** (RECOMMENDED): Generate 4 language variants of each video offline, serve as static MP4 files with H.264 codec for universal iOS Safari compatibility. This approach guarantees performance, avoids runtime complexity, and aligns with the "quick establishing shot" design goal.

2. **Runtime Player**: Use `<Player>` component to render videos client-side with dynamic props for language. Adds complexity and performance overhead but enables fully dynamic content.

**Primary recommendation:** Pre-render all cutscene videos in 4 language variants (12 total files: 3 video types × 4 languages), optimize with H.264 codec and CRF quality settings, serve as standard `<video>` elements with `autoplay muted playsinline` for iOS compatibility.

## Standard Stack

The established libraries/tools for programmatic video generation with React:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `remotion` | 4.0.381 | Core framework for programmatic video | Industry standard for React-based video, full React 19 support, mature APIs |
| `@remotion/cli` | 4.0.381 | CLI for rendering/preview | Official tooling for development workflow |
| `@remotion/bundler` | 4.0.381 | Webpack bundling for compositions | Required for programmatic rendering |
| `@remotion/renderer` | 4.0.381 | Node API for server-side rendering | Enables automated video generation |

### Supporting (Runtime Playback)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@remotion/player` | 4.0.381 | React component for embedding videos | When videos need runtime interactivity or dynamic props |

### Already Available
| Library | Version | Purpose | Integration |
|---------|---------|---------|-------------|
| `framer-motion` | 12.23.24 | Animation library (already in project) | Can be used within Remotion compositions for declarative animations |
| `gsap` | 3.14.2 | Animation library (already in project) | Works within compositions but has licensing restrictions (Webflow-owned) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pre-rendered MP4 | Runtime `<Player>` | Player adds ~100KB bundle + runtime overhead, but enables dynamic content/translations without re-rendering |
| Remotion | Video editing software (After Effects, Premiere) | Manual process, no programmatic generation, harder to maintain 4 language variants |
| H.264 codec | H.265/HEVC | Better compression but "Very poor" browser support, incompatible with iOS Safari |
| H.264 codec | VP9 (WebM) | Smaller files but "Very slow" encoding and moderate browser support |

**Installation:**
```bash
# Already installed in devDependencies
# remotion@4.0.381
# @remotion/cli@4.0.381
# @remotion/bundler@4.0.381
# @remotion/renderer@4.0.381
```

## Architecture Patterns

### Recommended Project Structure
```
remotion/
├── index.ts                    # registerRoot() entry point
├── Root.tsx                    # Register all <Composition> components
├── compositions/
│   ├── LevelIntro/
│   │   ├── index.tsx           # Main composition with calculateMetadata
│   │   ├── WorldFlyby.tsx      # Reusable flyby animation
│   │   └── types.ts            # Zod schema for props
│   ├── WorldTransition/
│   │   ├── index.tsx
│   │   ├── PortalAnimation.tsx
│   │   └── types.ts
│   └── Tutorial/
│       ├── index.tsx
│       ├── UIHighlight.tsx     # Overlay component
│       └── types.ts
├── shared/
│   ├── components/
│   │   ├── WorldBackground.tsx # Reusable background loader
│   │   └── TextOverlay.tsx     # RTL-aware text component
│   └── utils/
│       ├── interpolations.ts   # Common easing functions
│       └── audio.ts            # Audio layer helpers
└── assets/
    ├── audio/
    │   ├── meadows-ambient.mp3
    │   ├── springs-ambient.mp3
    │   └── caverns-ambient.mp3
    └── backgrounds/            # Symlink to public/images/adventure/
```

### Pattern 1: Pre-rendered Language Variants (RECOMMENDED)

**What:** Render separate MP4 files for each language using parameterized props.

**When to use:** When videos have minimal text, content doesn't change based on user state, and performance is critical.

**Example:**
```typescript
// remotion/compositions/LevelIntro/index.tsx
import { Composition } from 'remotion';
import { z } from 'zod';

const LevelIntroSchema = z.object({
  worldId: z.enum(['meadows', 'springs', 'caverns']),
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

export const LevelIntroComposition = () => {
  return (
    <Composition
      id="LevelIntro"
      component={LevelIntro}
      durationInFrames={240}  // 8 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
      schema={LevelIntroSchema}
      defaultProps={{
        worldId: 'meadows',
        locale: 'en',
      }}
    />
  );
};

// Render command for all variants:
// for world in meadows springs caverns; do
//   for locale in en he sv ja; do
//     npx remotion render remotion/index.ts LevelIntro \
//       --props='{"worldId":"'$world'","locale":"'$locale'"}' \
//       out/level-intro-$world-$locale.mp4
//   done
// done
```

### Pattern 2: Sequence-Based Timing

**What:** Use `<Sequence>` components to time multiple animations within a composition.

**When to use:** When building videos with multiple distinct phases (intro → main content → outro).

**Example:**
```typescript
// Source: https://www.remotion.dev/docs/sequence
import { Sequence, useCurrentFrame, interpolate } from 'remotion';

export const WorldTransition: React.FC<Props> = ({ fromWorld, toWorld }) => {
  return (
    <>
      {/* Phase 1: Show old world (0-60 frames) */}
      <Sequence from={0} durationInFrames={60}>
        <WorldBackground world={fromWorld} />
      </Sequence>

      {/* Phase 2: Portal animation (45-105 frames, overlaps) */}
      <Sequence from={45} durationInFrames={60}>
        <PortalAnimation />
      </Sequence>

      {/* Phase 3: Show new world (90-150 frames) */}
      <Sequence from={90} durationInFrames={60}>
        <WorldBackground world={toWorld} />
      </Sequence>
    </>
  );
};
```

### Pattern 3: Frame-Based Animation with interpolate()

**What:** Use `useCurrentFrame()` + `interpolate()` for declarative animations.

**When to use:** Always prefer this over imperative animation libraries for simple transitions.

**Example:**
```typescript
// Source: https://www.remotion.dev/docs/the-fundamentals
import { useCurrentFrame, interpolate } from 'remotion';

export const WorldFlyby: React.FC<Props> = ({ worldImage }) => {
  const frame = useCurrentFrame();

  // Fade in from 0 to 1 over first 30 frames
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Zoom from 1.2x to 1x over 60 frames (Ken Burns effect)
  const scale = interpolate(frame, [0, 60], [1.2, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      <img src={worldImage} alt="" />
    </div>
  );
};
```

### Pattern 4: Dynamic Metadata with calculateMetadata()

**What:** Asynchronously calculate video duration/dimensions based on props.

**When to use:** When video length depends on content (e.g., tutorial steps), or need to fetch assets before rendering.

**Example:**
```typescript
// Source: https://www.remotion.dev/docs/dynamic-metadata
import { CalculateMetadataFunction } from 'remotion';

export const calculateMetadata: CalculateMetadataFunction<TutorialProps> = async ({
  props,
}) => {
  // Could fetch tutorial steps from API
  const steps = await fetchTutorialSteps(props.locale);

  return {
    durationInFrames: steps.length * 90, // 3 seconds per step
    props: {
      ...props,
      steps, // Add fetched data to props
    },
  };
};
```

### Pattern 5: RTL Text Handling

**What:** Detect RTL languages and apply `dir="rtl"` + text-align adjustments.

**When to use:** When displaying Hebrew (or Arabic) text in videos.

**Example:**
```typescript
export const TextOverlay: React.FC<{ text: string; locale: Locale }> = ({
  text,
  locale,
}) => {
  const isRTL = locale === 'he'; // Hebrew is RTL

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        textAlign: isRTL ? 'right' : 'left',
        fontFamily: locale === 'he' ? 'Rubik, sans-serif' : 'Fredoka, sans-serif',
        // Keep visual composition the same (don't mirror), only flip text direction
      }}
    >
      {text}
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **DON'T wrap Player component in `<Composition>`** - Player takes components directly, not compositions
- **DON'T use large images without optimization** - Remotion loads assets per frame, unoptimized images slow rendering drastically
- **DON'T rely on external state** - Compositions must be pure functions of frame number and props
- **DON'T use `<Video>` inside compositions for source videos** - Use `<OffthreadVideo>` for better rendering performance
- **DON'T use viewport units (vw/vh)** - Video has fixed dimensions, use absolute values or percentages

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio layering/timing | Custom audio mixer with Web Audio API | `<Audio>` component with volume/playbackRate props | Remotion handles synchronization, trimming, and multi-layer audio automatically |
| Video quality/compression | Custom FFmpeg wrapper | `--codec`, `--crf`, `--prores-profile` CLI flags | Remotion exposes FFmpeg options with sensible defaults and validation |
| Skip button overlay | Custom video player controls | Runtime: `<Player controls>` + `renderPlayPauseButton`. Pre-rendered: Standard HTML5 `<video controls>` | Browser-native controls handle accessibility, keyboard shortcuts, fullscreen |
| Text animation | Manual frame-by-frame CSS | `interpolate()` + React inline styles | Declarative, predictable, easier to maintain than imperative animations |
| Multi-language rendering | Manual video duplication per language | Props-based rendering with `--props` CLI flag | Single composition definition, parameterized rendering eliminates duplication |

**Key insight:** Remotion provides declarative APIs for timing, audio, and rendering. Imperative approaches (manual FFmpeg, custom players, hand-coded animations) add complexity without benefits.

## Common Pitfalls

### Pitfall 1: iOS Safari Autoplay Restrictions

**What goes wrong:** Videos don't autoplay on iOS devices despite `autoplay` attribute.

**Why it happens:** iOS Safari requires THREE attributes for autoplay: `autoplay`, `muted`, AND `playsinline`. Missing any one causes autoplay to fail. Additionally, Low Power Mode blocks autoplay entirely.

**How to avoid:**
```html
<!-- REQUIRED for iOS Safari autoplay -->
<video autoplay muted playsinline>
  <source src="video.mp4" type="video/mp4" />
</video>
```

**Warning signs:**
- Videos autoplay on desktop but not mobile
- Videos work in Chrome iOS but not Safari iOS
- User reports "video doesn't start"

**Additional considerations:**
- "Silence" audio tracks are detected and block autoplay - remove audio track entirely for muted videos
- If video gains audio or becomes unmuted without user gesture, playback pauses
- Low Power Mode users may still block autoplay (can't be detected via API)

**Source:** [WebKit Blog - New Video Policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)

### Pitfall 2: Next.js SSR Hydration Errors with Player

**What goes wrong:** Remotion `<Player>` component causes hydration mismatches in Next.js, breaking the app.

**Why it happens:** Player component accesses browser APIs (video playback, canvas rendering) that don't exist during server-side rendering. Next.js tries to hydrate server-rendered HTML but encounters client-only dependencies.

**How to avoid:**
```typescript
// Mark Player component as client-only
'use client';

import dynamic from 'next/dynamic';

// Disable SSR for Player
const VideoPlayer = dynamic(
  () => import('@remotion/player').then(mod => mod.Player),
  { ssr: false }
);

export const VideoContainer = () => {
  return <VideoPlayer {...props} />;
};
```

**Warning signs:**
- Console errors: "Text content does not match server-rendered HTML"
- "Hydration failed" warnings
- Player renders blank or crashes on page load

**Alternative approach:** Use pre-rendered MP4 files with standard `<video>` tag (no hydration issues).

**Source:** [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error)

### Pitfall 3: Not Memoizing Player inputProps

**What goes wrong:** Player re-renders on every parent component update, causing jank/stutter during playback.

**Why it happens:** Player compares `inputProps` by reference. Creating new objects on every render triggers full Player re-render, interrupting video playback.

**How to avoid:**
```typescript
// BAD: Creates new object every render
<Player
  inputProps={{ locale: currentLocale, worldId: worldId }}
  {...otherProps}
/>

// GOOD: Memoize props object
const inputProps = useMemo(
  () => ({ locale: currentLocale, worldId: worldId }),
  [currentLocale, worldId]
);

<Player inputProps={inputProps} {...otherProps} />
```

**Warning signs:**
- Video playback stutters when parent component updates
- Performance profiler shows Player re-rendering frequently
- Seek bar position resets unexpectedly

**Source:** [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices)

### Pitfall 4: Using Wrong Codec for iOS Compatibility

**What goes wrong:** Videos render successfully but fail to play on iOS Safari (black screen or error).

**Why it happens:** iOS Safari only supports H.264 (MP4) and HEVC/H.265 natively. VP8/VP9 (WebM) and other codecs don't work. Additionally, H.265 has "very poor" browser support outside Apple ecosystem.

**How to avoid:**
```bash
# CORRECT: Use H.264 (default, universal support)
npx remotion render src/index.ts Video out/video.mp4

# AVOID: VP9 (doesn't work on iOS)
npx remotion render src/index.ts Video out/video.webm --codec=vp9

# AVOID: H.265 (Apple-only, inconsistent support)
npx remotion render src/index.ts Video out/video.mp4 --codec=h265
```

**Quality optimization:**
```bash
# Adjust CRF for file size (default: 18, range: 1-51)
# Lower = better quality/larger file, Higher = lower quality/smaller file
npx remotion render src/index.ts Video out/video.mp4 --crf=23
```

**Warning signs:**
- Videos work on desktop but show black screen on iPhone
- Browser console shows "MIME type not supported"
- File size is suspiciously small (wrong codec compression)

**Source:** [Remotion Encoding Guide](https://www.remotion.dev/docs/encoding)

### Pitfall 5: RTL Text Rendering Backwards

**What goes wrong:** Hebrew text displays with letters in reverse order or disconnected.

**Why it happens:** Default text rendering assumes LTR (left-to-right). Without explicit `dir="rtl"` attribute, Hebrew characters render in wrong order. Some video editing software doesn't support RTL at all.

**How to avoid:**
```typescript
// Set direction explicitly based on locale
<div
  dir={locale === 'he' ? 'rtl' : 'ltr'}
  style={{
    textAlign: locale === 'he' ? 'right' : 'left',
    unicodeBidi: 'embed', // Ensures proper bidirectional text handling
  }}
>
  {text}
</div>
```

**Testing checklist:**
- Render Hebrew variant explicitly: `--props='{"locale":"he"}'`
- Verify characters appear in correct order (read right-to-left)
- Check that punctuation stays at correct end of sentences
- Test mixed content (Hebrew text + English words/numbers)

**Warning signs:**
- Hebrew text reads backwards (שלום appears as םולש)
- Letters are separated/disconnected
- Numbers/English words appear on wrong side

**Source:** [W3C RTL Rendering Guide](https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl.en.html)

### Pitfall 6: Large Bundle Size from Unused Remotion Features

**What goes wrong:** Including `@remotion/player` package adds ~100KB+ to bundle even if not using runtime playback.

**Why it happens:** Player includes video playback engine, codec decoders, and rendering pipeline. These aren't tree-shakeable even if unused.

**How to avoid:**
- **Pre-rendered approach:** DON'T install `@remotion/player` at all - only use `@remotion/cli` and `@remotion/renderer` as devDependencies
- **Runtime approach:** Accept the bundle cost or use code splitting:

```typescript
// Lazy load Player component
const Player = lazy(() =>
  import('@remotion/player').then(mod => ({ default: mod.Player }))
);

// Only load when needed
{showVideo && (
  <Suspense fallback={<VideoPlaceholder />}>
    <Player {...props} />
  </Suspense>
)}
```

**Warning signs:**
- Bundle size exceeds performance budget (project target: 250KB gzipped)
- Lighthouse scores drop due to large JavaScript payload
- `bundlewatch` CI check fails

**Source:** Project's `package.json` bundlewatch config (250KB limit)

## Code Examples

Verified patterns from official sources:

### Level Intro Flyby (5-10s)

```typescript
// remotion/compositions/LevelIntro/index.tsx
// Source: https://www.remotion.dev/docs/the-fundamentals
import { AbsoluteFill, useCurrentFrame, interpolate, Audio } from 'remotion';
import { z } from 'zod';

const LevelIntroSchema = z.object({
  worldId: z.enum(['meadows', 'springs', 'caverns']),
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

type LevelIntroProps = z.infer<typeof LevelIntroSchema>;

export const LevelIntro: React.FC<LevelIntroProps> = ({ worldId, locale }) => {
  const frame = useCurrentFrame();

  // Ken Burns effect: zoom from 1.2x to 1x over 120 frames (4s)
  const scale = interpolate(frame, [0, 120], [1.2, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade in quickly over first 15 frames (0.5s)
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade out over last 30 frames (1s)
  const fadeOut = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  const backgroundImage = `/images/adventure/world-${worldId}-3d.png`;
  const ambientAudio = `/audio/${worldId}-ambient.mp3`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e', // Neo-navy fallback
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      {/* Background with Ken Burns zoom */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${scale})`,
          opacity,
        }}
      />

      {/* Ambient audio layer */}
      <Audio
        src={ambientAudio}
        volume={0.3}
        startFrom={0}
        endAt={240}
      />
    </AbsoluteFill>
  );
};
```

### World Transition Portal (10-15s)

```typescript
// remotion/compositions/WorldTransition/index.tsx
// Source: https://www.remotion.dev/docs/sequence
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Audio } from 'remotion';
import { z } from 'zod';

const TransitionSchema = z.object({
  fromWorldId: z.enum(['meadows', 'springs', 'caverns']),
  toWorldId: z.enum(['meadows', 'springs', 'caverns']),
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

type TransitionProps = z.infer<typeof TransitionSchema>;

export const WorldTransition: React.FC<TransitionProps> = ({
  fromWorldId,
  toWorldId,
  locale,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {/* Phase 1: Old world fades out (0-90 frames / 0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <WorldFadeOut worldId={fromWorldId} />
      </Sequence>

      {/* Phase 2: Portal animation (60-240 frames / 2-8s, overlaps) */}
      <Sequence from={60} durationInFrames={180}>
        <PortalAnimation fromWorld={fromWorldId} toWorld={toWorldId} />
      </Sequence>

      {/* Phase 3: New world fades in (210-360 frames / 7-12s) */}
      <Sequence from={210} durationInFrames={150}>
        <WorldFadeIn worldId={toWorldId} />
      </Sequence>

      {/* Portal sound effect (plays at frame 60) */}
      <Audio
        src="/audio/portal-whoosh.mp3"
        startFrom={60}
        volume={0.5}
      />
    </AbsoluteFill>
  );
};

const PortalAnimation: React.FC<{ fromWorld: string; toWorld: string }> = ({
  fromWorld,
  toWorld,
}) => {
  const frame = useCurrentFrame();

  // Portal grows from center over 90 frames (3s)
  const portalScale = interpolate(frame, [0, 90], [0, 2.5], {
    extrapolateRight: 'clamp',
  });

  // Rotation for magical effect
  const rotation = interpolate(frame, [0, 180], [0, 360], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, #00FFFF, #FF1493)`, // Cyan to pink
          transform: `scale(${portalScale}) rotate(${rotation}deg)`,
          boxShadow: '0 0 100px rgba(0, 255, 255, 0.8)',
        }}
      />
    </AbsoluteFill>
  );
};
```

### Tutorial UI Highlights (20-30s)

```typescript
// remotion/compositions/Tutorial/index.tsx
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { z } from 'zod';

const TutorialSchema = z.object({
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

type TutorialProps = z.infer<typeof TutorialSchema>;

// Translation keys (would use actual i18n in production)
const translations = {
  en: {
    step1: 'Swipe letters to form words',
    step2: 'Valid words score points',
    step3: 'Longer words = more points!',
  },
  he: {
    step1: 'החליקו אותיות ליצירת מילים',
    step2: 'מילים תקינות מזכות בנקודות',
    step3: 'מילים ארוכות יותר = יותר נקודות!',
  },
  // ... sv, ja
};

export const Tutorial: React.FC<TutorialProps> = ({ locale }) => {
  const t = translations[locale];

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {/* Step 1: Swipe gesture (0-180 frames / 0-6s) */}
      <Sequence from={0} durationInFrames={180}>
        <TutorialStep
          text={t.step1}
          locale={locale}
          highlight="swipe-gesture"
        />
      </Sequence>

      {/* Step 2: Word validation (180-360 frames / 6-12s) */}
      <Sequence from={180} durationInFrames={180}>
        <TutorialStep
          text={t.step2}
          locale={locale}
          highlight="word-validation"
        />
      </Sequence>

      {/* Step 3: Scoring (360-540 frames / 12-18s) */}
      <Sequence from={360} durationInFrames={180}>
        <TutorialStep
          text={t.step3}
          locale={locale}
          highlight="score-counter"
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const TutorialStep: React.FC<{
  text: string;
  locale: string;
  highlight: string;
}> = ({ text, locale, highlight }) => {
  const frame = useCurrentFrame();
  const isRTL = locale === 'he';

  // Fade in text
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Pulsing highlight box
  const pulseScale = interpolate(
    frame % 60, // Loop every 2 seconds
    [0, 30, 60],
    [1, 1.05, 1],
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
      }}
    >
      {/* Highlight box with pulsing animation */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 200,
          border: '4px solid #FFE135', // Neo-yellow
          borderRadius: 4,
          transform: `scale(${pulseScale})`,
          boxShadow: '4px 4px 0px black',
        }}
      />

      {/* Instruction text */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          fontFamily: isRTL ? 'Rubik, sans-serif' : 'Fredoka, sans-serif',
          fontSize: 48,
          color: '#FFFFFF',
          textAlign: 'center',
          textShadow: '4px 4px 0px black', // Neo-brutalist shadow
          opacity,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
```

### Pre-rendering Script (Generate All Variants)

```bash
#!/bin/bash
# scripts/render-cutscenes.sh

# Configuration
FPS=30
WIDTH=1920
HEIGHT=1080
CRF=23  # Quality: 18 (high) to 28 (lower, smaller files)
OUTPUT_DIR="public/videos/cutscenes"

mkdir -p $OUTPUT_DIR

# World IDs
WORLDS=("meadows" "springs" "caverns")
LOCALES=("en" "he" "sv" "ja")

echo "Rendering level intro videos..."
for world in "${WORLDS[@]}"; do
  for locale in "${LOCALES[@]}"; do
    echo "Rendering: level-intro-$world-$locale.mp4"
    npx remotion render \
      remotion/index.ts LevelIntro \
      "$OUTPUT_DIR/level-intro-$world-$locale.mp4" \
      --props="{\"worldId\":\"$world\",\"locale\":\"$locale\"}" \
      --codec=h264 \
      --crf=$CRF
  done
done

echo "Rendering world transition videos..."
# Only valid transitions (meadows->springs, springs->caverns)
TRANSITIONS=(
  "meadows:springs"
  "springs:caverns"
)

for transition in "${TRANSITIONS[@]}"; do
  IFS=':' read -r from_world to_world <<< "$transition"
  for locale in "${LOCALES[@]}"; do
    echo "Rendering: transition-$from_world-$to_world-$locale.mp4"
    npx remotion render \
      remotion/index.ts WorldTransition \
      "$OUTPUT_DIR/transition-$from_world-$to_world-$locale.mp4" \
      --props="{\"fromWorldId\":\"$from_world\",\"toWorldId\":\"$to_world\",\"locale\":\"$locale\"}" \
      --codec=h264 \
      --crf=$CRF
  done
done

echo "Rendering tutorial video..."
for locale in "${LOCALES[@]}"; do
  echo "Rendering: tutorial-$locale.mp4"
  npx remotion render \
    remotion/index.ts Tutorial \
    "$OUTPUT_DIR/tutorial-$locale.mp4" \
    --props="{\"locale\":\"$locale\"}" \
    --codec=h264 \
    --crf=$CRF
done

echo "Cutscene rendering complete!"
echo "Total files: $(ls -1 $OUTPUT_DIR/*.mp4 | wc -l)"
echo "Total size: $(du -sh $OUTPUT_DIR | cut -f1)"
```

### React Component for Playing Cutscenes

```typescript
// components/video/CutscenePlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CutscenePlayerProps {
  type: 'level-intro' | 'transition' | 'tutorial';
  worldId?: string; // For level-intro
  fromWorldId?: string; // For transition
  toWorldId?: string; // For transition
  onComplete?: () => void;
  onSkip?: () => void;
  allowSkipAfterMs?: number; // Default: 2000 (2s)
}

export const CutscenePlayer: React.FC<CutscenePlayerProps> = ({
  type,
  worldId,
  fromWorldId,
  toWorldId,
  onComplete,
  onSkip,
  allowSkipAfterMs = 2000,
}) => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  // Construct video path based on type and props
  const videoPath = (() => {
    const locale = language;
    if (type === 'level-intro' && worldId) {
      return `/videos/cutscenes/level-intro-${worldId}-${locale}.mp4`;
    }
    if (type === 'transition' && fromWorldId && toWorldId) {
      return `/videos/cutscenes/transition-${fromWorldId}-${toWorldId}-${locale}.mp4`;
    }
    if (type === 'tutorial') {
      return `/videos/cutscenes/tutorial-${locale}.mp4`;
    }
    return null;
  })();

  // Enable skip button after delay
  useEffect(() => {
    if (type === 'tutorial') {
      setCanSkip(true); // Tutorial skippable immediately
      return;
    }

    const timer = setTimeout(() => {
      setCanSkip(true);
    }, allowSkipAfterMs);

    return () => clearTimeout(timer);
  }, [type, allowSkipAfterMs]);

  // Handle video end
  const handleEnded = () => {
    if (!isSkipped) {
      onComplete?.();
    }
  };

  // Handle skip
  const handleSkip = () => {
    setIsSkipped(true);
    onSkip?.();
  };

  if (!videoPath) {
    console.error('Invalid cutscene configuration');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-neo-navy">
      {/* Video element with iOS Safari compatibility */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        className="w-full h-full object-cover"
      >
        <source src={videoPath} type="video/mp4" />
      </video>

      {/* Skip button (appears after delay) */}
      {canSkip && !isSkipped && (
        <button
          onClick={handleSkip}
          className="absolute top-8 right-8 px-6 py-3
                     bg-neo-yellow text-neo-navy font-neo-display font-bold
                     border-neo border-black rounded-neo
                     shadow-hard hover:shadow-hard-pressed
                     transition-all duration-100
                     animate-neo-pop"
          aria-label="Skip cutscene"
        >
          Skip
        </button>
      )}
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Video editing software (After Effects) | Programmatic generation (Remotion) | Remotion released 2020, matured by 2023 | Enables parameterized videos, version control, automated rendering pipelines |
| Manual multi-language duplication | Props-based rendering | Remotion 2.0+ (2021) | Single composition definition renders multiple variants via CLI props |
| Imperative animation (GSAP, manual CSS keyframes) | Declarative `interpolate()` API | Remotion core feature since 1.0 | Cleaner code, easier to reason about timing, no animation library needed |
| Flash/ActionScript for interactive video | HTML5 `<video>` + React overlays | Flash deprecated 2020, HTML5 standard | Universal browser support, mobile compatibility, accessibility |
| React Spring for Remotion animations | Remotion's built-in `spring()` | Remotion 2.0+ recommendation | Optimized for video frame rendering, simpler API, no external dependency |
| H.264 codec only | H.264 + optional AV1 for modern browsers | AV1 support growing 2024-2026 | Better compression (30-50% smaller) but H.264 still required for iOS fallback |

**Deprecated/outdated:**
- **Framer Motion in Remotion compositions**: Works but adds unnecessary bundle size. Use `interpolate()` instead. (Remotion docs recommend native APIs)
- **React Spring in Remotion**: Incompatible API design. Use `spring()` built-in function instead. (Officially documented incompatibility)
- **`delayRender()` + `useEffect()` for dynamic content**: Use `calculateMetadata()` instead for better performance. (Remotion 4.0+ recommendation)
- **`<Video>` component for embedded videos**: Use `<OffthreadVideo>` for better rendering performance. (Performance guide recommendation)
- **VP9 codec for iOS**: Never worked, still doesn't work. Always use H.264 for iOS Safari. (Codec compatibility matrix)

## Open Questions

Things that couldn't be fully resolved:

1. **Video delivery method: Pre-rendered vs. Lambda vs. bundled**
   - What we know: Pre-rendered (static MP4s) is simplest and most performant. Lambda enables on-demand rendering but adds AWS infrastructure complexity. "Bundled" approach wasn't well-documented.
   - What's unclear: Phase 1 deferred this decision ("Remotion infra validated, content in Phase 7"). Need to confirm: are videos pre-rendered during build, or generated on-demand?
   - Recommendation: **Use pre-rendered approach** - render all 12 video files (3 types × 4 languages) during build via npm script, commit to repo or upload to CDN. Simplest, fastest, no runtime overhead. If files are too large (>200KB each per performance budget), consider Lambda but defer until needed.

2. **Audio asset sourcing (ambient sounds, music)**
   - What we know: Need world-specific ambient audio (birds/nature for Meadows, water for Springs, crystal echoes for Caverns) plus background music
   - What's unclear: No audio assets found in repo. Will these be AI-generated like images? Licensed from stock libraries? Sourced externally?
   - Recommendation: Confirm audio asset strategy before implementation. Consider royalty-free libraries (e.g., freesound.org, Pixabay) or AI generation (e.g., ElevenLabs, Soundraw). Audio files must be optimized (<50KB each) to stay within performance budget.

3. **Skip button delay for level intros (2s per requirements)**
   - What we know: Requirements state "skippable after 2s". User research best practices say cutscenes >10s should always be skippable, preferably with ESC key.
   - What's unclear: Level intros are 5-10s (shorter than typical "must skip" threshold). Is 2s delay appropriate for such short videos? What if user has seen it multiple times?
   - Recommendation: Start with 2s delay as specified. Consider adding localStorage flag to remember "user has seen this world intro before" and make immediately skippable on subsequent views.

4. **RTL video composition direction (mirroring vs. text-only)**
   - What we know: CONTEXT.md states "Keep video direction/composition the same for all languages. Only ensure Hebrew text renders right-to-left when text appears. No mirrored compositions."
   - What's unclear: Does "Lexi always enters from same side" mean visual composition stays LTR even for Hebrew, or that Lexi enters from screen-right (which is "start" in RTL)?
   - Recommendation: Keep all visual layouts identical (no mirroring). Only reverse text direction and alignment. Test Hebrew variant to ensure it feels natural despite LTR composition.

## Sources

### Primary (HIGH confidence)
- [Remotion Fundamentals](https://www.remotion.dev/docs/the-fundamentals) - Core concepts, frame-based animation, composition structure
- [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices) - Performance optimization, event handling, memoization
- [Remotion Encoding Guide](https://www.remotion.dev/docs/encoding) - Codec options (H.264, H.265, VP9), CRF quality settings, compression
- [Remotion Dynamic Metadata](https://www.remotion.dev/docs/dynamic-metadata) - calculateMetadata() API, dynamic durations, props customization
- [Remotion Sequence Component](https://www.remotion.dev/docs/sequence) - Timing/layering animations, from/durationInFrames patterns
- [Remotion Player Component](https://www.remotion.dev/docs/player/player) - Player props, imperative control, event handlers, Next.js considerations
- [Remotion React 19 Compatibility](https://www.remotion.dev/docs/react-19) - Version requirements, ref types, backward compatibility notes
- [WebKit - New Video Policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) - iOS Safari autoplay requirements (muted, playsinline)

### Secondary (MEDIUM confidence)
- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error) - SSR hydration issues, client component patterns
- [Remotion Audio Components](https://www.remotion.dev/docs/media/audio) - Audio layering, volume control, playback rate, trimming
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance) - Rendering optimization, memoization strategies
- [W3C RTL Rendering Guide](https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl.en.html) - Bidirectional text, dir attribute, unicode-bidi
- [Remotion Server-Side Rendering Comparison](https://www.remotion.dev/docs/compare-ssr) - Lambda vs Cloud Run vs self-hosted performance/cost trade-offs

### Tertiary (LOW confidence - WebSearch only)
- [Remotion Skills GitHub](https://github.com/remotion-dev/skills/blob/main/skills/remotion/SKILL.md) - AI-driven video generation patterns (2026 development)
- [Short-Form Video UX Best Practices](https://www.shamusyoung.com/twentysidedtale/?p=26480) - Skippable cutscenes, ESC button behavior
- [iOS Video Optimization 2026](https://www.fastpix.io/blog/how-to-optimize-videos-for-ios) - H.264/HEVC recommendations, 30fps for mobile
- Community discussions on RTL support in video editing software - Identified ongoing challenges with Hebrew/Arabic in After Effects, Descript

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Remotion 4.0.381 is verified installed, React 19 compatibility confirmed in official docs
- Architecture: **HIGH** - Patterns sourced from official Remotion documentation with working code examples
- Pitfalls: **HIGH** - iOS autoplay requirements verified via WebKit blog (authoritative), Next.js hydration solutions confirmed in Next.js docs
- Video delivery: **MEDIUM** - Pre-rendered approach is standard practice but "deferred from Phase 1" decision needs clarification
- Audio assets: **LOW** - No audio files found in repo, sourcing strategy unclear
- RTL composition: **MEDIUM** - Text direction guidance clear from CONTEXT.md, but visual composition interpretation needs validation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days) - Remotion is stable, but check for 4.0.x patch releases for bug fixes
