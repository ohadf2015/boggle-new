---
allowed-tools: Read, Bash, Grep, Glob
argument-hint: [target-area] | --frontend | --backend | --full
description: Comprehensive performance audit with metrics, bottleneck identification, and optimization recommendations
---

## Audit: $ARGUMENTS

1. **Stack** - Language, framework, runtime, build tools, monitoring
2. **Code** - Inefficient algorithms, O(n²) loops, redundant operations, memory leaks
3. **Database** - Slow queries, missing indexes, N+1 problems, connection pooling
4. **Frontend** - Bundle size, unused code/dependencies, image optimization, re-renders
   - Run React Scan (in providers.tsx) for unnecessary re-renders and memoization
5. **Network** - API patterns, caching, unnecessary requests, payload sizes, CDN
6. **Async** - async/await usage, blocking operations, race conditions, parallel execution
7. **Memory** - Leaks, excessive consumption, garbage collection, object lifecycle
8. **Build** - Build times, bundling, tree shaking, dev vs prod optimizations
9. **Monitoring** - Existing metrics, KPIs, alerting, thresholds
10. **Profiling** - Run profilers, create benchmarks, measure before/after
11. **Recommendations** - Prioritize by impact/effort, provide code examples, architectural improvements

**Focus on high-impact, low-effort optimizations first.**