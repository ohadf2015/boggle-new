---
phase: 34
plan: 01
subsystem: ai-director
tags: [tdd, performance-tracking, sliding-window, ema, flow-detection]

dependency_graph:
  requires: []
  provides:
    - "AI Director type definitions"
    - "Flow threshold constants"
    - "Performance monitor with sliding window + EMA"
  affects:
    - "34-02: Flow state detector will use PerformanceWindow metrics"
    - "34-03: Intensity adjuster will use thresholds and adjustment rates"

tech_stack:
  added: []
  patterns:
    - "Sliding window algorithm for rolling metrics"
    - "Exponential Moving Average for smoothing"
    - "Factory function pattern for monitor creation"

files:
  created:
    - types/aiDirector.ts
    - lib/aiDirector/constants.ts
    - lib/aiDirector/performanceMonitor.ts
    - lib/aiDirector/__tests__/performanceMonitor.test.ts
  modified: []

decisions:
  - id: "34-01-001"
    decision: "Sliding window size of 10 for WPM calculation"
    rationale: "Balance between responsiveness and noise reduction"
  - id: "34-01-002"
    decision: "EMA alpha of 0.3 for metric smoothing"
    rationale: "Moderate smoothing prevents jittery updates while remaining responsive"
  - id: "34-01-003"
    decision: "60-second warm-up period before adjustments"
    rationale: "Allow player to settle into rhythm before detecting flow state"
  - id: "34-01-004"
    decision: "Flow thresholds: 3-7 WPM, 70-90% success, combo 2-4"
    rationale: "Calibrated for word game pace based on Csikszentmihalyi flow model"

metrics:
  duration: "6 minutes"
  completed: "2026-02-01"
---

# Phase 34 Plan 01: Performance Monitor Foundation Summary

Performance tracking foundation for AI Director using sliding window + EMA smoothing with TDD.

## One-liner

Sliding window tracker + EMA smoothing for WPM/success/combo metrics with 23 passing tests.

## What Was Built

### 1. Type Definitions (types/aiDirector.ts)

- `FlowState`: 'bored' | 'flow' | 'frustrated' | 'learning' based on Csikszentmihalyi model
- `PerformanceWindow`: WPM, success rate, combo maintenance, time-in-flow metrics
- `IntensityAdjustment`: Pacing controls (hint rate, power-up bonus, combo grace, celebration)
- `FlowThresholds`: Configurable min/max ranges for optimal flow detection
- `WordAttempt`: Individual attempt record with timestamp, validity, combo level

### 2. Constants (lib/aiDirector/constants.ts)

| Constant | Value | Purpose |
|----------|-------|---------|
| FLOW_THRESHOLDS | WPM: 3-7, Success: 70-90%, Combo: 2-4 | Flow detection boundaries |
| EMA_ALPHA | 0.3 | Smoothing factor for metrics |
| WARM_UP_PERIOD_MS | 60000 (60s) | Delay before adjustments |
| MIN_SAMPLE_SIZE | 10 | Minimum words before flow detection |
| WORD_WINDOW_SIZE | 10 | Sliding window capacity |
| DEFAULT_INTENSITY | All neutral (1.0x, +0, 0s, 0s) | Starting intensity |
| ADJUSTMENT_RATE | 0.1 | Gradual 10% transitions |

### 3. Performance Monitor (lib/aiDirector/performanceMonitor.ts)

**ExponentialMovingAverage class:**
- Configurable alpha for smoothing intensity
- `update(value)` applies EMA formula
- `reset()` returns to initial state

**SlidingWindowTracker class:**
- Fixed-size window (default 10 entries)
- `getWordsPerMinute()`: Rolling WPM from timestamps
- `getSuccessRate()`: Valid/total ratio
- `getAverageComboLevel()`: Mean combo maintained

**createPerformanceMonitor factory:**
- Combines sliding window + EMA for each metric
- `recordWord(valid, comboLevel)`: Add attempt
- `getMetrics()`: Returns PerformanceWindow
- `isWarmedUp()`: Checks warm-up + sample requirements
- `reset()`: Full state reset

## TDD Compliance

### RED Phase (Task 2)
- 23 tests written before implementation
- Tests failed with "Cannot find module '../performanceMonitor'"

### GREEN Phase (Task 3)
- Implementation made all 23 tests pass
- Test coverage: 96.39% statements, 100% lines

## Test Coverage

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
constants.ts           |      75 |      100 |     100 |     100 |
performanceMonitor.ts  |     100 |       80 |     100 |     100 |
-----------------------|---------|----------|---------|---------|
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 78f69cf5 | feat | AI Director types and constants |
| 891c5357 | test | Failing performance monitor tests (TDD RED) |
| f338d744 | feat | Performance monitor implementation (TDD GREEN) |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Sliding window size = 10**: Balances responsiveness vs noise. Larger windows smooth too much, smaller windows are jittery.

2. **EMA alpha = 0.3**: Industry standard for moderate smoothing. Higher alpha (0.5+) would track raw values too closely; lower (0.1) would lag significantly.

3. **60-second warm-up**: Prevents premature adjustments during game start. Players need time to read board, understand objective.

4. **Flow thresholds calibrated for word games**: 3-7 WPM reflects realistic word-finding pace (not typing speed). 70-90% success matches challenge-skill balance.

## Next Phase Readiness

**Ready for 34-02 (Flow State Detector):**
- PerformanceWindow interface exported for metric consumption
- FLOW_THRESHOLDS exported for state detection boundaries
- EMA smoothing ensures stable inputs to flow detector

**Integration points:**
- `detectFlowState(metrics: PerformanceWindow)` will consume monitor output
- Flow detector already exists in codebase (from prior research phase)

## Requirement Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| DDA-01: Performance tracking | COMPLETE | WPM, success rate, combo metrics with EMA |
| DDA-02: Flow state detection | Foundation | Types and thresholds ready for 34-02 |
