# Domain Pitfalls: v2.0 Adventure Overhaul

**Domain:** Feature-rich game mode with dynamic mechanics, power systems, and visual content
**Researched:** 2026-01-30

---

## CRITICAL PITFALLS

Mistakes that cause rewrites, major performance issues, or player abandonment.

### Pitfall 1: React Context Re-render Cascade (Performance Killer)

**What goes wrong:** When you have 15+ Context providers (this codebase already has them), and they're all passing large value objects, every context value change triggers re-renders in EVERY component that consumes that context - even if the component only uses one small piece of the value.

**Why it happens:** `useContext` subscribes to the entire context value and doesn't care that you only use a small part. A single state change in InGameContext (57 properties) or ProgressionContext (16 properties) causes every child component to re-render.

**Current codebase evidence:**
- 17 context providers already exist
- InGameContext has 57 properties (username, gameCode, letterGrid, comboLevel, etc.)
- ProgressionContext manages complex state with progression data
- Adding power-ups, boss mechanics, and difficulty state will balloon these contexts further

**Consequences:**
- 60fps drops to <30fps during animations
- Janky UI interactions, especially on mobile
- Battery drain from unnecessary renders
- Players perceive the game as "laggy"

**Prevention:**
1. **Split contexts by concern**: Don't add boss state to InGameContext - create BossContext
2. **Separate data from API**: Split read-only data (current level) from callbacks (onPowerUpUse)
3. **Memoize provider values**: Already documented in InGameContext.tsx line 74 - "parent component should memoize the value object" - ENFORCE THIS for new contexts
4. **Use React.memo on consumer components**: Prevent re-renders when props haven't changed
5. **Consider Zustand or Jotai**: For frequently-updating state like boss health or combo multipliers

**Detection:**
- Use React DevTools Profiler to measure re-render frequency
- If a component re-renders >5 times during a single animation, context is too large
- Test on low-end devices (not just your MacBook)

**Sources:**
- [React Context Performance Dangers](https://thoughtspile.github.io/2021/10/04/react-context-dangers/)
- [Pitfalls of Overusing React Context - LogRocket](https://blog.logrocket.com/pitfalls-of-overusing-react-context/)
- [How to Write Performant React Apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context)

---

### Pitfall 2: Framer Motion Layout Thrashing (Animation Nightmare)

**What goes wrong:** Animating the wrong CSS properties causes layout thrashing - the browser has to recalculate the entire page layout on every frame, dropping you from 60fps to 15fps.

**Why it happens:** Animating `width`, `height`, `top`, `left`, `margin`, or `padding` triggers layout recalculation. The browser must:
1. Read current layout (forced synchronous layout)
2. Write new styles
3. Recalculate entire page layout
4. Repaint
This happens 60 times per second during animation.

**Current codebase context:**
- Framer Motion is already in use (AdaptiveMotion.tsx)
- Project has 20+ components using framer-motion
- Adding cascading tiles, score explosions, boss attack animations will multiply this risk

**Consequences:**
- Animations stutter and lag
- Mobile devices overheat
- iOS Safari performs especially poorly
- Players perceive the game as "broken"

**Prevention:**
1. **Animate transforms only**: Use `transform: translate()` instead of `left/top`
2. **Use opacity**: It's the only non-transform property that's cheap to animate
3. **Batch DOM reads/writes**: Separate all DOM reads from writes, use `requestAnimationFrame`
4. **Use layoutId sparingly**: Framer Motion's `layoutId` triggers measurements on every component in the tree
5. **Leverage existing AdaptiveMotion**: The codebase already has performance-aware motion components - USE THEM
6. **Enable hardware acceleration**: Ensure `will-change: transform` or `transform: translateZ(0)` for animated elements

**Good example:**
```tsx
// ✅ GOOD - Animates transform (GPU-accelerated)
<motion.div
  initial={{ opacity: 0, x: -100 }}
  animate={{ opacity: 1, x: 0 }}
/>

// ❌ BAD - Animates layout properties
<motion.div
  initial={{ opacity: 0, marginLeft: -100 }}
  animate={{ opacity: 1, marginLeft: 0 }}
/>
```

**Detection:**
- Use Chrome DevTools Performance tab, look for "Recalculate Style" taking >5ms
- Enable "Paint flashing" in DevTools to see repaints
- If entire screen flashes green during animation, you're animating the wrong properties
- Test on actual mobile devices (iPhone 12/13, not just simulator)

**Sources:**
- [React Animation Performance - Steve Kinney](https://stevekinney.com/courses/react-performance/animation-performance)
- [Frameworks and Layout Thrashing - Frontend Masters](https://frontendmasters.com/courses/web-performance/frameworks-and-layout-thrashing/)
- [Framer Motion Performance Tips](https://www.framer.com/motion/guide-upgrade/)
- [Motion Performance Guide](https://motion.dev/docs/react-layout-animations)

---

### Pitfall 3: Power Creep (Game Balance Collapse)

**What goes wrong:** Power-ups start feeling "essential" instead of "helpful." Players can trivialize content with power-up stacking. Later bosses become impossible without power-ups, creating a pay-to-win perception (even if power-ups are free).

**Why it happens:** Developers design new power-ups to feel impactful, so they make them stronger than existing ones. Older content wasn't designed for these power-ups, so it becomes too easy. Newer content is balanced around power-ups, becoming impossible without them.

**Consequences:**
- Early levels become boring (too easy with power-ups)
- Later levels feel mandatory to use power-ups (not a choice)
- Players perceive the game as "pay-to-win" even if power-ups are earned
- Skill becomes less important than power-up inventory
- Difficult to add new content without making it trivial or impossible

**Prevention:**
1. **Horizontal progression over vertical**: Add power-ups that enable different strategies, not just "better numbers"
   - ✅ "Freeze Timer" enables careful word hunting (different playstyle)
   - ❌ "2x Score" just makes everything easier (vertical power)
2. **Soft caps on stacking**: Diminishing returns if players stack multiple score multipliers
3. **Boss mechanics that ignore power-ups**: Some boss attacks can't be avoided with power-ups (forces skill)
4. **Design content WITHOUT power-ups first**: Balance the level, then add power-ups as optional help
5. **Separate progression systems**: Stars unlock worlds (skill-based), coins unlock power-ups (optional)
6. **Test with and without**: Every level must be beatable without power-ups, faster with them

**Warning signs:**
- Playtesters say "I can't beat this without power-ups"
- Players feel forced to grind coins for power-ups to progress
- Boss difficulty jumps drastically if you don't use power-ups
- Reddit posts complaining about "pay-to-win" mechanics

**Sources:**
- [Power Creep - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/PowerCreep)
- [How to Avoid Power Creep in Multiplayer Games - LinkedIn](https://www.linkedin.com/advice/0/how-do-you-avoid-mitigate-effects-power-creep-multiplayer)
- [Scaling Power the Right Way](https://www.fateless.gg/news/scaling-power-the-right-way/)
- [On Power Creep - Bruno Dias](https://brunodias.dev/2021/11/27/power-creep.html)

---

### Pitfall 4: Rubber-Banding Perception (Adaptive Difficulty Failure)

**What goes wrong:** Players notice the adaptive difficulty system and feel like the game is "cheating" or "patronizing" them. They feel victories are hollow because the game "let them win."

**Why it happens:** DDA (Dynamic Difficulty Adjustment) is meant to keep players in the "flow state," but if it's too obvious, players feel the challenge is artificial. Classic example: racing games where AI opponents suddenly speed up when you're winning.

**Current risk for this project:**
- You're planning "Dynamic difficulty system adapting to player performance"
- Word puzzles make DDA especially obvious (if the board suddenly has easier words, players notice)

**Consequences:**
- Players feel cheated when they lose ("the game made the board harder")
- Players feel patronized when they win ("the game gave me easy words")
- Undermines sense of skill and accomplishment
- Players may quit even when they're winning

**Prevention:**
1. **Make it invisible**: DDA adjustments should be subtle and unnoticeable
   - ✅ Adjust word length targets slightly (7-letter vs 8-letter minimum)
   - ❌ Change board difficulty mid-game (players notice immediately)
2. **Pre-game adjustments only**: Select difficulty BEFORE the level starts based on past performance
3. **Transparent difficulty options**: Let players choose Easy/Medium/Hard explicitly
4. **Gradual, not sudden**: If adjusting mid-game, change over 3-4 rounds, not instantly
5. **Performance-based unlocks**: Instead of making content easier, unlock power-ups/hints after failures
6. **Never adjust during boss fights**: Boss difficulty should be fixed - adjusting feels like cheating

**Academic research findings:**
- "Rubber-banding can feel unfair that the computer doesn't follow the same rules"
- "For DDA to be successful, it should be invisible – the player should never feel it happening"
- Recent research (2022-2026) focuses on improving rubber-banding adaptability while remaining undetectable

**Detection:**
- Playtest with think-aloud protocol: If players say "that felt too easy" or "the game helped me," DDA is too obvious
- Watch for pattern recognition: Players saying "the board always gets easier after I fail"

**Sources:**
- [Adaptive Rubber-Banding System of DDA in Racing Games](https://journals.sagepub.com/doi/abs/10.3233/ICG-220207)
- [More Than Meets the Eye: The Secrets of DDA - Game Developer](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment)
- [What Is Rubber Banding in Video Games - How-To Geek](https://www.howtogeek.com/what-is-rubber-banding-in-video-games-and-why-does-everyone-hate-it/)

---

### Pitfall 5: Meta-Progression Grind Wall

**What goes wrong:** Players feel like they're playing a "free-to-play mobile gacha game" with a grinding paywall. Permanent upgrades make skill less important than time spent grinding.

**Why it happens:** Designers want to give players a sense of persistent progress, but if the meta-progression becomes gating (you NEED upgrades to progress), it feels like grinding instead of playing.

**Current risk for this project:**
- You're planning "Meta-progression with permanent upgrades and skill trees"
- This is a premium word puzzle game, not a F2P mobile game - grind perception is especially damaging

**Consequences:**
- Players complain about "hitting a paywall" even though the game isn't F2P
- Skill becomes less important than grinding for upgrades
- Players who don't grind feel left behind
- Reddit reviews saying "grindy" or "mobile game mechanics"

**Prevention:**
1. **Skill > upgrades**: Upgrades should provide ~20% advantage, not 200%
   - A skilled player without upgrades should beat an unskilled player with max upgrades
2. **Horizontal upgrades**: Unlock new strategies, not just bigger numbers
   - ✅ "Unlock hint system" (new capability)
   - ❌ "+50% base score" (just inflation)
3. **Fast unlock cadence**: Players should unlock something every 1-2 play sessions
4. **No grinding for basics**: Core mechanics shouldn't require upgrades
5. **Cosmetic vs functional**: Consider making skill tree mostly cosmetic (different word highlight colors, board themes)
6. **Transparent costs**: Players should know exactly how much grinding is needed for next unlock

**Warning signs:**
- Playtesters say "I feel like I'm just grinding for upgrades"
- Progression feels like "playing until character is powerful enough" instead of "learning and strategizing"
- Players can't complete world 3 without skill tree upgrades (means upgrades are gating content)

**Sources:**
- [Transitioning to Free-to-Play - Meta Horizon OS](https://developers.meta.com/horizon/resources/monetization-f2p-transition)
- [Meta Progression Discussion - ResetEra](https://www.resetera.com/threads/do-you-like-meta-progression-in-your-roguelikes-roguelites.1341955/)
- [Meta Progression in Roguelikes](https://notes.hamatti.org/gaming/video-games/meta-progression-with-gradual-tutorial-in-roguelike-games)

---

## MODERATE PITFALLS

Mistakes that cause delays, technical debt, or significant rework.

### Pitfall 6: Boss Fight Clarity Failure

**What goes wrong:** Players don't understand boss attack patterns. One-shot mechanics that aren't telegraphed. Unclear win conditions. Bosses that are either trivially easy or impossibly hard with no middle ground.

**Why it happens:** Designers know the mechanics intimately, so they underestimate how confusing they are to new players. Boss playtesting is expensive (requires completing earlier content), so it gets less iteration.

**Consequences:**
- Players quit in frustration saying "that was unfair"
- Bosses are forgotten if too easy
- Negative reviews complaining about difficulty spikes
- Expensive iteration cycles (requires replaying entire world to test)

**Prevention:**
1. **Telegraph everything**: Visual/audio cues 1-2 seconds before boss attacks
2. **Tutorial boss**: First boss should teach mechanics, not punish players
3. **Escalating mechanics**: Boss should use basic attacks first, complex patterns later
4. **Clear visual language**: Each boss attack type has distinct visual/sound
5. **Forgiving first encounter**: Boss should be slightly too easy on first try
6. **Iteration budget**: Plan for 5-6 playtesting cycles per boss (they always need more tuning)
7. **Avoid "unfair" mechanics**: Nothing that kills players for playing well (e.g., Odin getting "bored" in FF7 Rebirth)

**Testing requirements:**
- Fresh playtesters (not developers who know the mechanics)
- Watch them play WITHOUT explaining anything
- If >50% die to mechanic without understanding why, it needs better telegraphing

**Sources:**
- [Boss Design: How to Make an Unforgettable Boss Battle](https://gamedesignskills.com/game-design/game-boss-design/)
- [24 Hardest Video Game Bosses in 2026 - Eneba](https://www.eneba.com/hub/games/hardest-video-game-bosses/)
- Community discussions on boss design mistakes (Steam forums, Reddit)

---

### Pitfall 7: Visual Overload & Accessibility

**What goes wrong:** Too many particle effects, animations, and visual feedback create sensory overload. Players with photosensitivity, ADHD, or motion sensitivity can't play. The screen becomes "an illegible mess, obscuring crucial details."

**Why it happens:** Designers add visual effects to make the game feel "juicy" and satisfying, but they don't test cumulative impact. Each individual effect seems fine, but 50 effects simultaneously = chaos.

**Current risk for this project:**
- "Candy Crush-style explosions" - Candy Crush is infamous for visual chaos
- "Animated feedback" - Every action triggering animation compounds
- "Cinematic boss battles" - More effects = more overload
- Neo-brutalist design with bold colors and high contrast already visually intense

**Consequences:**
- Players report headaches, eye strain, nausea
- Can't track important information (where's my score? which words did I find?)
- Accessibility complaints, potential app store rating drop
- Legal risk in some jurisdictions (accessibility laws)

**Prevention:**
1. **Accessibility setting for reduced effects**: Already implemented in AdaptiveMotion.tsx - extend it to particles
2. **2026 trend: Minimalist UI**: Industry is moving toward "less clutter, more clarity"
   - Games like Alto's Odyssey use environmental cues instead of HUD
   - Sans-serif typography, radial menus, contextual displays
3. **Particle budget**: Max 20 particles on screen simultaneously
4. **Layered effects**: Background particles (subtle), mid-ground (moderate), foreground (bold) - don't overlap
5. **Color-blind modes**: Test with color-blind simulators
6. **Motion settings**: Respect `prefers-reduced-motion` (already in useShouldReduceMotion)
7. **Flash warning**: Avoid rapid flashing (>3 flashes per second = seizure risk)

**2026 industry direction:**
- "Minimalist UI design leads 2026 trends, stripping away clutter for deeper immersion"
- "Prioritizes minimalist UIs, ray-traced photorealism, stylized cozy art"
- "Solution prioritizes gameplay and player comfort, using particle effects sparingly and purposefully"

**Testing checklist:**
- [ ] Test with `prefers-reduced-motion: reduce` enabled
- [ ] Use color-blind simulator (Stark plugin or similar)
- [ ] Ask someone with ADHD/photosensitivity to playtest
- [ ] Record gameplay and watch at 0.5x speed - can you track all information?

**Sources:**
- [The Particle Effect Apocalypse - Wayline](https://www.wayline.io/blog/particle-effect-apocalypse-avoiding-visual-excess)
- [Pixels to Immersion: Graphics in 2026 Games](https://www.webpronews.com/pixels-to-immersion-graphics-revolutionizing-player-eyes-in-2026-games/)
- [VFX in Game Development Guide](https://www.juegostudio.com/blog/all-about-vfx-in-game-development-in-2024)

---

### Pitfall 8: WebSocket State Race Conditions

**What goes wrong:** Real-time multiplayer has race conditions where clients get out of sync. Player sees different boss health than server. Power-up usage doesn't register. Animation state desyncs.

**Why it happens:** WebSockets are asynchronous. Events can arrive out of order. Client-side state updates happen before server confirmation. Network latency causes timing mismatches.

**Current codebase evidence:**
- Socket.IO already in use (SocketContext.tsx, SocketEventBusContext.tsx)
- Real-time game state in InGameContext
- Adding boss battles and power-ups will multiply state synchronization complexity

**Consequences:**
- Players see boss health at 0% but boss is still attacking (desync)
- Power-up activated but didn't work (dropped message)
- Leaderboard shows wrong scores during live game
- Negative reviews: "multiplayer is broken"

**Prevention:**
1. **Server authoritative**: Server is source of truth, always
2. **Event cache during connection**: Recent 2026 solution - queue messages until UI ready
   ```
   1. Fetch initial state
   2. Establish WebSocket connection
   3. Cache incoming messages
   4. Fetch state again (catch missed events)
   5. Replay queued messages in order
   ```
3. **Sequence numbers**: Number all messages, detect gaps, request retransmission
4. **Optimistic UI with rollback**: Show power-up effect immediately, rollback if server rejects
5. **Heartbeat/health checks**: Detect stale connections, force reconnect
6. **Idempotent handlers**: Duplicate messages should be safe to process twice
7. **Rate limiting**: Already implemented at 50 msg/10s - keep it

**Current protection:**
- Backend has rate limiting in `backend/middleware/rateLimit.ts`
- WebSocket handlers use `createHandler` with validation

**New risks from v2.0:**
- Boss attack synchronization (all players see same attack at same time)
- Power-up inventory state (client thinks they have 3 hints, server says 2)
- Combo multiplier timing (combo expires on client but server disagrees)

**Sources:**
- [Handling Race Conditions in Real-Time Apps - DEV](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)
- [Building Multiplayer Tic Tac Toe with Next.js + Socket.IO](https://medium.com/@vaibhavkhushalani/building-a-real-time-multiplayer-tic-tac-toe-with-next-js-socket-io-open-source-fc0804a940a5)
- [Server-Sent Events vs WebSockets in 2026](https://www.nimbleway.com/blog/server-sent-events-vs-websockets-what-is-the-difference-2026-guide)

---

### Pitfall 9: Next.js + Socket.IO Deployment Trap

**What goes wrong:** Socket.IO works perfectly in local development but breaks on Vercel deployment because "serverless functions do not support WebSockets."

**Why it happens:** Next.js with Socket.IO requires a custom server (Express). Custom servers disable Vercel's optimizations (serverless functions, Automatic Static Optimization, edge network).

**Current codebase:**
- Uses custom Express server (`server.ts`)
- Socket.IO integration via custom server
- NOT using Vercel serverless

**Consequences:**
- Can't deploy to Vercel (current architecture is fine with this)
- Lose Next.js optimizations (serverless, auto-scaling, edge caching)
- Must manage server scaling manually
- Higher hosting costs (always-on server vs serverless)

**Prevention:**
1. **Acknowledge the trade-off**: Custom server is intentional, not a mistake
2. **Deploy to VM or container**: Use Railway, Render, DigitalOcean, AWS EC2, not Vercel
3. **Load balancing**: For scaling, use load balancer + clustering
4. **Sticky sessions**: Ensure WebSocket connections stick to same server instance
5. **Alternative architecture**: Consider separating Socket.IO server from Next.js app
   - Next.js on Vercel (SSR, static pages)
   - Socket.IO on separate server (Railway, Render)
   - More complex but leverages each platform's strengths

**Don't change unless:**
- You're hitting scale issues (>10K concurrent connections)
- Hosting costs become prohibitive
- You need edge network CDN benefits

**Sources:**
- [How to Use with Next.js - Socket.IO](https://socket.io/how-to/use-with-nextjs)
- [Integrating Socket.IO with App Router - GitHub Discussion](https://github.com/vercel/next.js/discussions/50097)
- [Implementing WebSocket Communication in Next.js - LogRocket](https://blog.logrocket.com/implementing-websocket-communication-next-js/)

---

### Pitfall 10: Asset Performance & Memory Leaks

**What goes wrong:** Remotion videos, boss graphics, particle images accumulate in memory and never get garbage collected. Page uses 500MB+ RAM, crashes on mobile devices.

**Why it happens:** JavaScript can't "leak" memory technically, but objects can be referenced longer than necessary. `AudioBuffer` and `WebGLTexture` retain large unmanaged memory outside JS heap.

**Current risk for this project:**
- "Enhanced visual content pipeline (Remotion videos, Image MCP graphics)"
- Boss battles with unique graphics per boss
- Particle systems with sprite sheets
- Remotion video generation is "computationally intensive" and "heavy workload"

**Consequences:**
- Mobile browsers crash after 10-15 minutes of gameplay
- iOS Safari especially bad (aggressive memory limits)
- Players report app "slowing down over time"
- Negative reviews: "crashes constantly"

**Prevention:**
1. **Asset streaming**: Load assets on-demand, unload when not needed
   - Load boss graphics when entering boss fight, unload after
   - Load world 2 textures when entering world 2, unload world 1 textures
2. **Voiceover one-line-at-time**: Load audio line, play it, unload it (don't preload all audio)
3. **WebP optimization**: Images MUST be WebP quality 80 (not 90), <200KB target
   - Already documented in CLAUDE.md - enforce in asset pipeline
4. **Remotion Lambda for server-side**: Don't generate videos on client, use Remotion Lambda for distributed rendering
5. **Texture atlases**: Combine multiple small images into one sprite sheet (fewer texture objects)
6. **Dispose WebGL textures**: Explicitly call `.dispose()` on THREE.js textures
7. **Memory profiling**: Use Chrome DevTools Memory tab, take heap snapshots before/after boss fights

**Current protections:**
- Image optimization guidelines in CLAUDE.md (WebP, quality 80, <200KB)
- Scripts for optimization: `npm run optimize:image`, `npm run asset:pipeline`

**New risks from v2.0:**
- Multiple boss graphics loaded simultaneously
- Remotion video generation on client (should be server-side)
- Particle sprite sheets accumulating

**Testing checklist:**
- [ ] Heap snapshot before boss fight, after boss fight - memory should return to baseline
- [ ] Play for 30 minutes on iPhone 12 - should not crash
- [ ] Check Network tab - total assets downloaded should be <10MB
- [ ] Use Lighthouse "Avoid enormous network payloads" audit

**Sources:**
- [Optimizing Your HTML5 Video Game - Filament Games](https://www.filamentgames.com/blog/optimizing-your-html5-video-game-a-case-study/)
- [How to Fix Memory Leaks in 3D Game Development - LinkedIn](https://www.linkedin.com/advice/0/how-can-you-identify-fix-memory-leaks-3d-game-development-ixmse)
- [Game Asset Optimization - Samsung Developer](https://developer.samsung.com/galaxy-gamedev/resources/articles/asset.html)
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance)

---

## MINOR PITFALLS

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Scope Creep (Feature Explosion)

**What goes wrong:** "Let's add one more boss mechanic... and one more power-up... and a pet system... and seasonal events..." The v2.0 milestone balloons from 3 months to 9 months.

**Why it happens:** Feature creep is "the excessive ongoing expansion of new features" that goes beyond basic function. Game development is especially prone because every feature sounds cool in isolation.

**Current risk:**
- v2.0 scope is already MASSIVE:
  - Dynamic board mechanics (moving tiles, cascades, explosions)
  - Power-up system with mid-game boosters
  - Meta-progression with skill trees
  - Boss battle overhaul
  - Enhanced visual pipeline (Remotion, Image MCP, Python)
  - Polished UI
  - Dynamic difficulty
  - Complete v1.1 carryover
- That's 8 major feature categories - each could be a milestone

**Consequences:**
- Missed deadlines, indefinite "almost done" state
- Budget overruns (if commercial project)
- Team burnout
- Quality suffers (rushing to finish ballooned scope)
- "Development hell" - project never ships

**Prevention:**
1. **MoSCoW method**:
   - **Must have**: Dynamic mechanics, boss battles, basic power-ups
   - **Should have**: Meta-progression, skill trees
   - **Could have**: Advanced particle effects, cinematic cutscenes
   - **Won't have** (this release): Seasonal events, pet system, PvP arena
2. **Feature freeze date**: 2 weeks before target completion, NO new features
3. **Vertical slice first**: Build ONE complete world with all features before adding more worlds
4. **Ruthless prioritization**: Ask "does this directly serve the core goal?" for every feature
5. **Cut confidently**: If a feature slips schedule by >20%, CUT IT and save for v2.1
6. **Beware "while I'm here"**: Don't refactor unrelated code during feature work

**2026 context:**
- "Production quality is measured by intent, authenticity, and alignment with player motivation"
- "Studios that understand their audience, apply discipline to scale, and use technology purposefully will shape gaming's next era"

**Warning signs:**
- Milestone is >50% over original time estimate
- You're saying "just one more small feature"
- Backlog has 30+ unimplemented ideas
- You can't explain the feature in one sentence

**Sources:**
- [Scope Creep in Indie Games - Wayline](https://www.wayline.io/blog/scope-creep-indie-games-avoiding-development-hell)
- [Scope Creep vs Future Creep in Game Development](https://www.manuelsanchezdev.com/blog/scope-vs-future-creep-game-development)
- [How to Avoid Scope Creep in Game Development - Codecks](https://www.codecks.io/blog/2025/how-to-avoid-scope-creep-in-game-development/)

---

### Pitfall 12: Technical Debt During Feature Rush

**What goes wrong:** You add boss battles, power-ups, and meta-progression without cleaning up existing code. Test coverage drops. 500+ line files proliferate. Six months later, you can't add new features without breaking three old features.

**Why it happens:** "I'll refactor later" is the developer's lie. Pressure to ship features means cutting corners. Technical debt compounds exponentially.

**Current codebase status:**
- Good: CLAUDE.md enforces <500 lines per file
- Good: TDD is mandatory (22-tdd-strict.md)
- Risk: Adding 8 major feature categories will test this discipline

**Consequences:**
- v2.1 takes 3x longer because of v2.0 tech debt
- Bugs in old features when adding new features
- New developers can't onboard (code is incomprehensible)
- Refactoring becomes so expensive you avoid it (debt spiral)

**Prevention:**
1. **Refactor continuously, not in "tech debt sprints"**:
   - Allocate 10-15% of each sprint to tech debt
   - Refactor WHILE adding features, not after
2. **Boy Scout Rule**: Leave code better than you found it
3. **Test coverage must not decrease**:
   - v2.0 should maintain or increase test coverage
   - If coverage drops >5%, stop and write tests
4. **File size enforcement**:
   - Already in CLAUDE.md: <500 lines per file, <300 for components
   - Use linter to enforce (fail build if exceeded)
5. **Code review for debt**: Reject PRs that add tech debt without plan to address it
6. **DevOps integration** (2026 approach):
   - Small updates to architecture during development cycle
   - Prevents need for "major overhauls" later

**2026 best practice:**
- "DevOps teams integrate refactoring into development cycle, with small updates keeping systems maintainable without major future overhauls"
- "Prevent new debt: for every story you develop, make sure technical debt isn't getting worse"

**Warning signs:**
- Test coverage trending downward
- PRs touching >10 files for "simple" features
- Developers saying "I don't understand this code"
- Bug fix introduces 2 new bugs

**Sources:**
- [Refactor All The Time Instead of Tech Debt Day - DEV](https://dev.to/jesterxl/refactor-all-the-time-instead-of-tech-debt-day-1cj3)
- [How DevOps Reduces Technical Debt in 2026](https://c4techservices.com/how-devops-reduces-technical-debt-in-2026/)
- [Technical Debt and Refactoring - Aviator](https://www.aviator.co/blog/technical-debt-and-the-role-of-refactoring/)

---

## PHASE-SPECIFIC WARNINGS

Recommendations for which phases need deeper research or extra caution.

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Dynamic Board Mechanics** | Layout thrashing from animating tiles | Research: CSS transform animations, `will-change`, GPU acceleration. Use Framer Motion's `layoutId` sparingly |
| **Power-Up System** | Power creep making content too easy | Research: Horizontal progression, soft caps, test every level without power-ups first |
| **Meta-Progression** | Grind wall perception | Research: F2P progression curves (to avoid them), unlock cadence benchmarks |
| **Boss Battles** | Unfair/unclear mechanics | Research: Boss design patterns, telegraphing best practices. Budget 5-6 iteration cycles per boss |
| **Visual Content Pipeline** | Memory leaks from Remotion/images | Research: Asset streaming, WebGL texture disposal, Remotion Lambda for server-side rendering |
| **Polished UI** | Context re-render cascades | Research: Context splitting patterns, Zustand/Jotai for high-frequency state |
| **Dynamic Difficulty** | Rubber-banding perception | Research: Invisible DDA techniques, pre-game vs mid-game adjustment tradeoffs |
| **v1.1 Carryover** | Technical debt from rushed features | Research: Refactoring while adding features, Boy Scout Rule enforcement |

---

## MITIGATION STRATEGY SUMMARY

**Before starting v2.0:**
1. [ ] Split existing large contexts (InGameContext, ProgressionContext) by concern
2. [ ] Audit current animation usage - are we animating transforms or layout properties?
3. [ ] Establish memory budget: Max MB per world, max particles on screen
4. [ ] Define power-up design principles: Horizontal > vertical, skill > upgrades
5. [ ] Set up continuous profiling: React DevTools Profiler, Chrome Performance tab

**During development:**
1. [ ] Test every feature on low-end device (iPhone 12, not MacBook)
2. [ ] Playtest bosses with fresh testers (not developers)
3. [ ] Monitor test coverage weekly - must not decrease
4. [ ] Code review for context patterns, animation properties, asset loading
5. [ ] Refactor continuously (10-15% sprint capacity)

**Before release:**
1. [ ] Accessibility audit: Reduced motion, color-blind modes, particle budget
2. [ ] Memory profiling: 30-minute play session should not leak
3. [ ] Power-up balance: Can every level be beaten without power-ups?
4. [ ] DDA testing: Is adaptive difficulty noticeable? (It shouldn't be)
5. [ ] Performance testing: 60fps on iPhone 12 during boss battles?

---

## RESEARCH CONFIDENCE

| Area | Confidence | Notes |
|------|------------|-------|
| Animation Performance | HIGH | WebSearch verified with current 2026 sources, specific to React/Framer Motion |
| Game Balance (Power Creep) | MEDIUM | Industry patterns well-documented, but specific to word puzzles (not typical) |
| Adaptive Difficulty | MEDIUM | Academic research + industry practice, but implementation details matter |
| Meta-Progression | MEDIUM | F2P patterns documented, but applying to premium game requires care |
| Boss Design | LOW | General principles found, but word-puzzle bosses are unusual (may need innovation) |
| Visual Overload | HIGH | 2026 accessibility trends clearly documented, industry moving toward minimalism |
| WebSocket Race Conditions | HIGH | Recent 2026 solutions found, specific to Socket.IO + Next.js |
| Asset Performance | HIGH | Specific to Remotion, WebGL, mobile browsers - well-researched |
| Scope Creep | HIGH | Universal problem, 2026 solutions documented |
| Technical Debt | HIGH | 2026 DevOps approach clearly documented |

---

## CONCLUSION

The v2.0 Adventure Overhaul is ambitious and exciting, but the research surfaced 12 critical pitfalls that could derail the project:

**Top 3 Risks:**
1. **React Context re-render cascade** - Already have 17 contexts, adding more state will cause performance collapse
2. **Animation layout thrashing** - Animating wrong CSS properties will drop mobile to <30fps
3. **Power creep** - Power-ups will trivialize content or gate progression if not carefully balanced

**Key Insight:** The 2026 gaming industry is trending toward **minimalism, performance, and player comfort** over visual excess. This aligns well with the project's existing performance-aware architecture (AdaptiveMotion, ProgressionContext optimization notes).

**Recommended Phase Order (based on risk):**
1. Start with **Dynamic Board Mechanics** - Highest technical risk, needs animation research
2. Add **Power-Up System** - Medium risk, needs balance research, no dependencies
3. Implement **Boss Battles** - High iteration cost, needs mechanics tested with real players
4. Add **Meta-Progression** - Lower risk if power-ups are balanced first
5. Polish **Visual Pipeline** - Last, to avoid visual overload accumulation
6. Tune **Dynamic Difficulty** - Very last, requires all other systems working

This ordering front-loads technical risk and allows course correction before visual polish.
