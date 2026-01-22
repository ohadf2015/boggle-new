# Domain Pitfalls: Video Content, AI Assets & Visual Polish

**Domain:** Web game enhancement with video, AI-generated art, and polish
**Researched:** 2026-01-22
**Confidence:** HIGH (verified with official docs + community sources)

---

## Executive Summary

Adding video content, AI-generated assets, and visual polish to existing web games introduces pitfalls across **four critical domains**:

1. **Remotion Integration** - Performance, bundling, SSR complexity
2. **AI Image Generation** - Consistency, artifacts, workflow chaos
3. **Background Removal** - Quality degradation, edge detection failures
4. **Game Polish** - Over-engineering, performance regressions, style drift

**Most Critical Risk:** Performance regressions on mobile (video autoplay restrictions, bundle size bloat, memory exhaustion)

---

## Critical Pitfalls (Can Cause Rewrites)

### Pitfall 1: Remotion Breaks Next.js Production Builds

**What goes wrong:**
- `@remotion/bundler` includes Webpack, creating Webpack-in-Webpack conflict in Next.js API routes
- FFmpeg binary not included in bundled API routes (missing dependencies)
- Player component causes infinite re-renders when improperly integrated
- SSR/hydration mismatches when video state managed incorrectly

**Why it happens:**
- Remotion designed for standalone rendering, not embedded in meta-frameworks
- Developers assume Remotion works like standard React libraries
- Documentation gap between "works in React" and "works in Next.js production"

**Consequences:**
- Build fails in production (works in dev)
- 500 errors on video-heavy pages
- Memory leaks from Player re-renders crash client
- Videos don't play due to missing FFmpeg

**Prevention:**
```typescript
// ❌ DON'T: Use @remotion/bundler in Next.js API routes
import { bundle } from '@remotion/bundler';

// ✅ DO: Bundle outside API routes, use pre-rendered videos
// Phase 1: Generate videos server-side during build
// Phase 2: Serve as static .mp4/.webm files
// Phase 3: Use Player only for preview/dev tools
```

**Detection:**
- Build passes locally, fails in Vercel/production
- API routes timeout or return 500
- Player component causes 100% CPU usage
- `git log` shows imports from `@remotion/bundler` in `/app` or `/pages`

**Which phase:**
- **Phase 1 (Planning):** Decide video delivery strategy (SSR vs pre-rendered)
- **Phase 2 (Remotion Setup):** Validate build works in production environment
- **Phase 3 (Integration):** Load test Player component performance

**Source:** [Remotion Next.js Documentation](https://www.remotion.dev/docs/miscellaneous/nextjs)

---

### Pitfall 2: iOS Safari Blocks All Video Playback

**What goes wrong:**
- Videos won't autoplay on iPhone/iPad (Safari restrictions)
- Cutscenes require user tap, breaking game flow
- Low Power Mode disables autoplay entirely
- Videos with audio fail silently

**Why it happens:**
- iOS Safari requires user interaction for audio/video playback
- Developers test on desktop Chrome, assume mobile "just works"
- `autoplay` attribute ignored on iOS without `muted` + `playsinline`

**Consequences:**
- Game freezes waiting for video that never plays
- Users see black screen, assume game is broken
- Adventure mode cutscenes require taps (immersion-breaking)

**Prevention:**
```html
<!-- ❌ DON'T: Rely on autoplay for gameplay videos -->
<video autoplay>

<!-- ✅ DO: Muted + playsinline, prompt for audio -->
<video autoplay muted playsinline>
```

**Strategy:**
- All cutscenes MUST work muted (visual storytelling only)
- Audio as optional enhancement (user enables sound)
- Fallback: Skip to gameplay if video fails after 2s timeout

**Detection:**
- Test on real iPhone (not simulator)
- Check DevTools console for autoplay errors
- Verify in Low Power Mode (Settings → Battery)

**Which phase:**
- **Phase 2 (Remotion Setup):** Test iOS Safari compatibility
- **Phase 3 (Integration):** Implement autoplay fallbacks
- **Phase 5 (Polish):** User testing on mobile devices

**Source:** [WebKit Video Policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)

---

### Pitfall 3: AI-Generated Assets Lack Consistency

**What goes wrong:**
- Character designs change between images (style drift)
- Background art feels "generic AI" not "LexiClash brand"
- Artifacts in hands, text, small details
- Every prompt variation introduces visual inconsistency

**Why it happens:**
- AI models don't maintain "visual memory" across generations
- Minor prompt changes produce major style shifts
- Models trained on generic data, not your specific art style
- Developers iterate without tracking prompt versions

**Consequences:**
- Adventure mode worlds look like different games
- Players notice "AI slop" aesthetic (brand damage)
- Rework required to achieve visual cohesion
- Wasted budget on unusable generations

**Prevention:**
1. **Establish Style Guide First**
   - Generate 3-5 "golden examples" for each asset type
   - Document exact prompts that work
   - Lock down style descriptors (don't iterate prompts)

2. **Use Consistency Tools**
   - Seedream 4.5 for style consistency across images
   - Hunyuan Image 3.0 for character consistency
   - Scenario.com for custom model training

3. **Version Control for Prompts**
   - Treat prompts as code (git-tracked)
   - Every asset links to exact prompt version
   - A/B test prompts before committing to generation

4. **Post-Process Everything**
   - Generate in AI's strengths, then manually adjust
   - Apply consistent color grading/filters
   - Manual touchup for artifacts (hands, faces)

**Detection:**
- Side-by-side comparison shows obvious style drift
- Players comment "looks AI-generated"
- Assets require extensive post-processing
- Prompt changes break existing visual language

**Which phase:**
- **Phase 1 (Planning):** Create visual style guide with examples
- **Phase 3 (AI Image Gen):** Lock prompts after golden examples approved
- **Phase 4 (Integration):** Manual QA for consistency across all assets

**Sources:**
- [AI Art for Game Developers 2025 Guide](https://apatero.com/blog/ai-art-game-developers-complete-guide-2025)
- [Best AI Image Generators in 2026](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/)

---

### Pitfall 4: RTL Support Breaks in Video Content

**What goes wrong:**
- Hebrew subtitles render backwards (punctuation on wrong side)
- Text overlays ignore RTL direction in Remotion
- Cutscene UI elements don't mirror for RTL
- Fonts don't load for Hebrew/Arabic characters

**Why it happens:**
- Video tools assume LTR (left-to-right) text by default
- Subtitle formats (.srt) have limited RTL support
- Remotion doesn't auto-detect `dir="rtl"` context
- Developers test in English only

**Consequences:**
- Hebrew players see garbled text in cutscenes
- Game unplayable for 25% of target audience (Hebrew/Arabic)
- Expensive re-rendering of all video content
- Brand damage in RTL markets

**Prevention:**
```typescript
// ✅ DO: Explicitly handle RTL in Remotion compositions
import { useLocale } from '@/contexts/LanguageContext';

export const Cutscene = () => {
  const { locale } = useLocale();
  const isRTL = locale === 'he';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      textAlign: isRTL ? 'right' : 'left',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      {/* Video content */}
    </div>
  );
};
```

**Strategy:**
1. Generate separate video versions per language (not subtitles)
2. Test RTL from day one (not at end)
3. Use Unicode BIDI characters for subtitle files
4. Load multi-script fonts (Rubik supports Hebrew)

**Detection:**
- Switch to Hebrew in dev → video text looks wrong
- Punctuation appears on left instead of right
- Text overlays overflow container boundaries

**Which phase:**
- **Phase 2 (Remotion Setup):** Test RTL rendering early
- **Phase 3 (Integration):** Generate language-specific video versions
- **Phase 5 (Polish):** RTL QA with native Hebrew speaker

**Sources:**
- [Netflix RTL Timed Text Requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/236229167)
- [LinkedIn Voice & Video Internationalization](https://www.linkedin.com/advice/3/what-tools-frameworks-support-voice-video)

---

## Moderate Pitfalls (Cause Delays/Debt)

### Pitfall 5: Bundle Size Bloat from Remotion

**What goes wrong:**
- Remotion Player adds 200KB+ to bundle
- First Contentful Paint (FCP) degrades by 2-3 seconds
- Mobile users on 3G see loading spinners

**Prevention:**
- Dynamic import Player component (code-split)
- Pre-render videos to .mp4, avoid runtime Player on critical paths
- Use Player only in dev/preview tools, not production gameplay

**Detection:**
- `npm run build` shows bundle > 500KB
- Lighthouse score drops below 90
- WebPageTest shows 3G load time > 5s

**Which phase:**
- Phase 2: Bundle analysis before full integration
- Phase 4: Lighthouse testing on mobile

**Source:** [Next.js Bundle Size Optimization](https://www.coteries.com/en/articles/reduce-size-nextjs-bundle)

---

### Pitfall 6: Unnecessary Player Re-renders Kill Performance

**What goes wrong:**
- Parent component re-renders on every frame update
- Player state (`currentTime`) triggers React re-render cascade
- 60 FPS video → 60 re-renders/second → browser freeze

**Prevention:**
```typescript
// ❌ DON'T: Update parent state on time change
const [time, setTime] = useState(0);
<Player onTimeUpdate={(t) => setTime(t)} />

// ✅ DO: Use ref, render controls as siblings
const playerRef = useRef<PlayerRef>(null);
<Player ref={playerRef} />
<Controls playerRef={playerRef} />
```

**Detection:**
- React DevTools shows Player re-rendering continuously
- CPU usage spikes to 100% during video playback
- Browser frame rate drops below 30 FPS

**Which phase:**
- Phase 3: Load testing during integration

**Source:** [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices)

---

### Pitfall 7: Background Removal Produces Low-Quality Assets

**What goes wrong:**
- Rough edges, halos around characters
- Transparent areas have white/gray fringes
- Small details (hair, fingers) disappear
- Blurry results from low-res source images

**Prevention:**
1. **Source Quality Rules**
   - Use high-res AI generations (1024x1024 minimum)
   - Even lighting (no harsh shadows)
   - High contrast subject vs background

2. **Tool Selection**
   - Remove.bg for character portraits (AI-powered)
   - Manual Photoshop for hero assets
   - Batch processing only for simple assets

3. **Post-Processing**
   - Feather edges 1-2px for smooth blend
   - Check on dark AND light backgrounds
   - Manual cleanup for artifacts

**Detection:**
- Assets look good on white, bad on dark (or vice versa)
- Zoom in → see jagged edges or halos
- Hair/fur looks "chewed up"

**Which phase:**
- Phase 3: Test removal on sample assets before batch processing
- Phase 4: Manual QA on final composited assets

**Sources:**
- [Remove.bg High-Quality Background Removal](https://www.remove.bg/b/introducing-higher-resolutions-support)
- [Canva Background Removal Guide](https://www.pixelbin.io/blog/how-to-remove-background-in-canva)

---

### Pitfall 8: Video Compression Destroys Visual Quality

**What goes wrong:**
- Cutscenes look pixelated/blocky on 4K screens
- Color banding in gradients (Neo-Brutalist solid colors)
- Harsh transitions create artifacts
- File size balloons (500MB+ for 30s video)

**Why it happens:**
- Default export settings use low bitrate (< 5 Mbps)
- H.264 compression not optimized for flat colors/text
- Developers prioritize file size over quality

**Prevention:**
1. **Codec Selection**
   - Use H.265/HEVC for better quality at lower bitrate
   - AV1 for modern browsers (50% smaller, same quality)
   - WebM (VP9) as fallback

2. **Encoding Settings**
   - Target 10-15 Mbps for 1080p (not 2-5 Mbps)
   - 2-pass encoding for consistent quality
   - CRF 18-23 (lower = higher quality)

3. **Resolution Strategy**
   - Generate 1080p for desktop, 720p for mobile
   - Use `<video>` with multiple sources (srcset pattern)

**Detection:**
- Video looks worse than gameplay graphics
- Banding visible in solid color backgrounds
- File size > 5MB for 10s clip

**Which phase:**
- Phase 2: Test export settings with sample videos
- Phase 5: Visual QA on multiple devices/resolutions

**Sources:**
- [Why Cutscenes Look Worse Than Gameplay](https://www.alibaba.com/product-insights/why-do-video-game-cutscenes-sometimes-look-worse-than-gameplay-graphics-explained.html)
- [Low Bitrate Cutscene Issues - ResetEra](https://www.resetera.com/threads/pet-peeve-pre-rendered-cutscenes-with-low-bitrates.413877/)

---

### Pitfall 9: AI Asset Workflow Has No Version Control

**What goes wrong:**
- Lost track of which prompt generated which asset
- Can't reproduce "good" results
- No ownership/deprecation policy for old assets
- Duplicate/conflicting assets pile up

**Why it happens:**
- AI generation feels disposable ("just regenerate")
- No git-like system for images (binary files)
- Teams generate faster than they organize

**Prevention:**
1. **Naming Convention**
   ```
   world-1_background_desert_v3_prompt-hash-abc123.png
   ^theme   ^type      ^style ^ver ^traceability
   ```

2. **Metadata File**
   ```json
   {
     "asset_id": "world-1_background_desert_v3",
     "generated_at": "2026-01-15T10:30:00Z",
     "prompt": "neo-brutalist desert landscape, bold colors...",
     "model": "seedream-4.5",
     "seed": 42,
     "approved_by": "art_director",
     "status": "production"
   }
   ```

3. **Folder Structure**
   ```
   assets/
   ├── approved/      ← Production-ready
   ├── review/        ← Pending approval
   ├── archive/       ← Deprecated (don't delete)
   └── tests/         ← Experiments
   ```

**Detection:**
- Can't find source prompt for existing asset
- Multiple versions with no clear "latest"
- "final_FINAL_v2_REAL.png" naming chaos

**Which phase:**
- Phase 1: Define asset management system before generating
- Phase 3: Enforce naming/metadata during generation

**Sources:**
- [AI Workflow Version Control - PromptLayer](https://blog.promptlayer.com/version-control-ai/)
- [AI Digital Asset Management in 2026](https://www.aprimo.com/blog/ai-in-digital-asset-management-how-2026-is-changing-everything)

---

## Minor Pitfalls (Annoyances, Fixable)

### Pitfall 10: Over-Polishing Diminishes Returns

**What goes wrong:**
- Spending 40 hours tweaking animations that players see for 2 seconds
- Paralysis from "not polished enough" mindset
- Delay launch for non-critical visual improvements

**Why it happens:**
- "Polish is getting a system from 90% to 100%, but that last 10% takes just as long as the first 90%"
- No clear "done" criteria for subjective improvements

**Prevention:**
- Define "MVP polish" vs "nice-to-have polish"
- Time-box polish work (max 20% of phase time)
- User test at 80% polish → validate before perfecting

**Detection:**
- Spending more time on polish than core features
- Team debates pixel-perfect alignment for hours
- Launch date slips for cosmetic changes

**Which phase:**
- Phase 5: Set hard deadline for polish phase

**Source:** [The Art of Game Polish - Gamasutra](https://www.gamedeveloper.com/design/the-art-of-game-polish-developers-speak)

---

### Pitfall 11: Remotion SSR Memory Exhaustion

**What goes wrong:**
- Server crashes rendering long videos
- Lambda functions timeout (15min limit)
- Memory leaks in `<Video>` cache

**Prevention:**
- Use `disallowParallelEncoding` for memory-constrained environments
- Render short clips (< 30s), stitch client-side
- Monitor memory usage during renders

**Detection:**
- `Out of Memory` errors during `npx remotion render`
- CPU/memory spikes visible in monitoring

**Which phase:**
- Phase 2: Load test rendering pipeline

**Source:** [Remotion Server-Side Rendering Docs](https://www.remotion.dev/docs/ssr)

---

### Pitfall 12: Forgetting Accessible Video Controls

**What goes wrong:**
- Keyboard users can't play/pause (no focus states)
- Screen readers don't announce video state
- No captions for deaf/hard-of-hearing players

**Prevention:**
- Add `aria-label` to custom video controls
- Provide caption tracks (WebVTT format)
- Keyboard shortcuts (Space = play/pause)

**Detection:**
- Tab navigation skips video controls
- Screen reader announces nothing
- WCAG audit fails

**Which phase:**
- Phase 4: Accessibility review

---

## Game Polish Anti-Patterns

### Anti-Pattern 1: Animations Without Purpose

**What goes wrong:**
- Motion for motion's sake (distracting, not delightful)
- 2-second transitions delay gameplay
- Animations don't communicate state changes

**Fix:**
- Every animation must serve a purpose (feedback, state change, focus)
- Max 300ms for non-critical animations
- Respect `prefers-reduced-motion`

---

### Anti-Pattern 2: Inconsistent Neo-Brutalist Style

**What goes wrong:**
- Some elements have soft shadows (breaks hard shadow rule)
- Rounded corners mixed with sharp angles
- Pastel colors mixed with bold primary palette

**Fix:**
- Enforce design system via CSS utilities (`shadow-hard`, not arbitrary values)
- Lint for forbidden Tailwind classes (e.g., `shadow-lg`)
- Visual regression testing (Percy, Chromatic)

---

### Anti-Pattern 3: Performance Regressions from Polish

**What goes wrong:**
- Adding particle effects tanks FPS
- Large video files slow page load
- Animations cause layout thrashing

**Fix:**
- Lighthouse score must not drop > 5 points
- Performance budget: 500KB total assets per page
- Profile before/after polish changes

---

## Prevention Checklist by Phase

### Phase 1: Planning & Research
- [ ] Decide: Pre-rendered videos vs runtime Player?
- [ ] Define visual style guide (3-5 golden examples)
- [ ] Establish asset naming/version control system
- [ ] Set iOS Safari compatibility requirements
- [ ] Define "MVP polish" vs "nice-to-have"

### Phase 2: Remotion Setup & Testing
- [ ] Test Next.js production build with Remotion
- [ ] Verify iOS Safari autoplay (muted + playsinline)
- [ ] Bundle size analysis (target < 500KB)
- [ ] Load test SSR rendering (memory/CPU limits)
- [ ] Test RTL text rendering in sample video

### Phase 3: AI Image Generation & Integration
- [ ] Lock down prompts after golden examples
- [ ] Version control all prompts (git-tracked)
- [ ] Test background removal on sample assets
- [ ] Verify style consistency across asset batches
- [ ] Document exact tools/models used

### Phase 4: Integration & QA
- [ ] Manual QA for AI asset consistency
- [ ] Test video playback on iOS Safari
- [ ] Verify RTL support in all video content
- [ ] Accessibility review (keyboard, screen reader, captions)
- [ ] Performance testing (Lighthouse, bundle size)

### Phase 5: Polish & Optimization
- [ ] Time-box polish work (max 20% of phase)
- [ ] Visual regression testing (design system compliance)
- [ ] User testing on mobile devices
- [ ] Final RTL QA with native speakers
- [ ] Performance budget validation

---

## Early Warning Signs

| Warning Sign | What It Means | Action |
|--------------|---------------|--------|
| Build passes locally, fails in production | Remotion/Next.js bundling issue | Check for `@remotion/bundler` in API routes |
| Videos don't autoplay on iPhone | iOS Safari restrictions | Add `muted playsinline` attributes |
| AI assets look different every generation | Style drift from prompt variations | Lock prompts, use consistency tools |
| Can't find source prompt for asset | No version control | Implement metadata tracking |
| Hebrew text looks wrong in videos | RTL not handled | Test with `dir="rtl"` early |
| Lighthouse score dropped 10+ points | Bundle size or performance regression | Analyze bundle, optimize assets |
| Player component causes 100% CPU | Unnecessary re-renders | Use `ref` pattern, not state updates |
| Background removal has halos/artifacts | Low source quality or wrong tool | Use high-res sources, manual cleanup |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Remotion Pitfalls | HIGH | Official docs + community issues well-documented |
| AI Asset Issues | MEDIUM | Emerging domain, tools evolving rapidly |
| iOS Safari Restrictions | HIGH | WebKit policies stable since 2017, verified 2026 |
| RTL Video Support | MEDIUM | Limited tooling, mostly manual workarounds |
| Performance | HIGH | Standard web vitals + game-specific benchmarks |

---

## Sources

### Remotion
- [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices)
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance)
- [Using @remotion/renderer in Next.js](https://www.remotion.dev/docs/miscellaneous/nextjs)
- [Remotion Server-Side Rendering](https://www.remotion.dev/docs/ssr)

### AI Image Generation
- [AI Art for Game Developers 2025 Guide](https://apatero.com/blog/ai-art-game-developers-complete-guide-2025)
- [Best AI Image Generators in 2026](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/)
- [AI Workflow Version Control](https://blog.promptlayer.com/version-control-ai/)

### Video & Performance
- [WebKit Video Policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Why Cutscenes Look Worse Than Gameplay](https://www.alibaba.com/product-insights/why-do-video-game-cutscenes-sometimes-look-worse-than-gameplay-graphics-explained.html)
- [Next.js Bundle Size Optimization](https://www.coteries.com/en/articles/reduce-size-nextjs-bundle)

### RTL & Internationalization
- [Netflix RTL Timed Text Requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/236229167)
- [LinkedIn Voice & Video Internationalization](https://www.linkedin.com/advice/3/what-tools-frameworks-support-voice-video)

### Game Polish
- [The Art of Game Polish](https://www.gamedeveloper.com/design/the-art-of-game-polish-developers-speak)
- [Game Development Anti-Patterns](https://dl.acm.org/doi/10.1145/3511430.3511436)
