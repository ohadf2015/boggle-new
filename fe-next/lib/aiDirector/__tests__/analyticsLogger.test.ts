import { vi, type Mock } from 'vitest';
/**
 * Analytics Logger Tests
 *
 * Tests DDA analytics event creation, logging, and aggregation.
 * DDA-04: Analytics track difficulty effectiveness
 */
import {
  createDDAEvent,
  createDDAAnalyticsPayload,
  logDDAEvent,
  aggregateDDAEffectiveness,
  type DDAAnalyticsEvent,
} from '../analyticsLogger';
import { DEFAULT_INTENSITY } from '../constants';

// Mock fetch with proper typing
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

describe('createDDAEvent', () => {
  it('should create event with all required fields', () => {
    const event = createDDAEvent({
      sessionId: 'test-session-123',
      metrics: {
        wordsPerMinute: 5,
        successRate: 0.8,
        comboMaintenance: 3,
        timeInFlow: 120,
      },
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'normal',
      world: 1,
      level: 3,
      isBossBattle: false,
      flowState: 'flow',
    });

    expect(event.sessionId).toBe('test-session-123');
    expect(event.flowState).toBe('flow');
    expect(event.wordsPerMinute).toBe(5);
    expect(event.successRate).toBe(0.8);
    expect(event.comboMaintenance).toBe(3);
    expect(event.timeInFlow).toBe(120);
    expect(event.tier).toBe('normal');
    expect(event.world).toBe(1);
    expect(event.level).toBe(3);
    expect(event.isBossBattle).toBe(false);
    expect(event.timestamp).toBeDefined();
  });

  it('should include adjustment trigger when provided', () => {
    const event = createDDAEvent({
      sessionId: 'test-session',
      metrics: { wordsPerMinute: 5, successRate: 0.8, comboMaintenance: 3, timeInFlow: 0 },
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'normal',
      world: 1,
      level: 1,
      isBossBattle: false,
      flowState: 'learning',
      adjustmentTrigger: 'combo_break',
    });

    expect(event.adjustmentTrigger).toBe('combo_break');
  });

  it('should handle boss battle flag correctly', () => {
    const event = createDDAEvent({
      sessionId: 'test-session',
      metrics: { wordsPerMinute: 4, successRate: 0.7, comboMaintenance: 2, timeInFlow: 60 },
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'hard',
      world: 2,
      level: 5,
      isBossBattle: true,
      flowState: 'frustrated',
    });

    expect(event.isBossBattle).toBe(true);
    expect(event.tier).toBe('hard');
  });
});

describe('createDDAAnalyticsPayload', () => {
  it('should create payload with dda prefixed fields', () => {
    const event: DDAAnalyticsEvent = {
      sessionId: 'session-123',
      timestamp: Date.now(),
      flowState: 'flow',
      wordsPerMinute: 6,
      successRate: 0.85,
      comboMaintenance: 4,
      timeInFlow: 180,
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'hard',
      world: 2,
      level: 5,
      isBossBattle: false,
      adjustmentTrigger: 'periodic',
    };

    const payload = createDDAAnalyticsPayload(event);

    expect(payload.action).toBe('update');
    expect(payload.sessionId).toBe('session-123');
    expect(payload.ddaFlowState).toBe('flow');
    expect(payload.ddaWordsPerMinute).toBe(6);
    expect(payload.ddaSuccessRate).toBe(0.85);
    expect(payload.ddaComboMaintenance).toBe(4);
    expect(payload.ddaTimeInFlow).toBe(180);
    expect(payload.ddaTier).toBe('hard');
    expect(payload.ddaIsBossBattle).toBe(false);
    expect(payload.ddaAdjustmentTrigger).toBe('periodic');
  });

  it('should omit trigger when not provided', () => {
    const event: DDAAnalyticsEvent = {
      sessionId: 'session-456',
      timestamp: Date.now(),
      flowState: 'learning',
      wordsPerMinute: 4,
      successRate: 0.7,
      comboMaintenance: 2,
      timeInFlow: 90,
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'easy',
      world: 1,
      level: 2,
      isBossBattle: false,
    };

    const payload = createDDAAnalyticsPayload(event);

    expect(payload.ddaAdjustmentTrigger).toBeUndefined();
  });
});

describe('logDDAEvent', () => {
  it('should POST event to analytics endpoint', async () => {
    let capturedMethod: string | null = null;
    server.use(
      http.post('*/api/analytics/log-session*', ({ request }) => {
        capturedMethod = request.method;
        return HttpResponse.json({ ok: true });
      })
    );

    const event: DDAAnalyticsEvent = {
      sessionId: 'session-123',
      timestamp: Date.now(),
      flowState: 'learning',
      wordsPerMinute: 4,
      successRate: 0.75,
      comboMaintenance: 2,
      timeInFlow: 60,
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'normal',
      world: 1,
      level: 1,
      isBossBattle: false,
    };

    const result = await logDDAEvent(event);

    expect(result).toBe(true);
    expect(capturedMethod).toBe('POST');
  });

  it('should return false on fetch error', async () => {
    server.use(
      http.post('*/api/analytics/log-session*', () => HttpResponse.error())
    );

    const event: DDAAnalyticsEvent = {
      sessionId: 'session-123',
      timestamp: Date.now(),
      flowState: 'learning',
      wordsPerMinute: 4,
      successRate: 0.75,
      comboMaintenance: 2,
      timeInFlow: 60,
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'normal',
      world: 1,
      level: 1,
      isBossBattle: false,
    };

    const result = await logDDAEvent(event);

    expect(result).toBe(false);
  });

  it('should return false on non-OK response', async () => {
    server.use(
      http.post('*/api/analytics/log-session*', () => new HttpResponse(null, { status: 500 }))
    );

    const event: DDAAnalyticsEvent = {
      sessionId: 'session-123',
      timestamp: Date.now(),
      flowState: 'learning',
      wordsPerMinute: 4,
      successRate: 0.75,
      comboMaintenance: 2,
      timeInFlow: 60,
      intensityAdjustments: DEFAULT_INTENSITY,
      tier: 'normal',
      world: 1,
      level: 1,
      isBossBattle: false,
    };

    const result = await logDDAEvent(event);

    expect(result).toBe(false);
  });

  it('should include all DDA fields in request body', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/analytics/log-session*', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ok: true });
      })
    );

    const event: DDAAnalyticsEvent = {
      sessionId: 'session-789',
      timestamp: Date.now(),
      flowState: 'flow',
      wordsPerMinute: 5.5,
      successRate: 0.82,
      comboMaintenance: 3.5,
      timeInFlow: 120,
      intensityAdjustments: {
        hintEscalationRate: 1.2,
        powerUpSpawnBonus: 1,
        comboGracePeriod: 1,
        celebrationDuration: 0.5,
      },
      tier: 'hard',
      world: 3,
      level: 10,
      isBossBattle: true,
      adjustmentTrigger: 'session_end',
    };

    await logDDAEvent(event);

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.ddaFlowState).toBe('flow');
    expect(capturedBody!.ddaWordsPerMinute).toBe(5.5);
    expect(capturedBody!.ddaSuccessRate).toBe(0.82);
    expect(capturedBody!.ddaComboMaintenance).toBe(3.5);
    expect(capturedBody!.ddaTimeInFlow).toBe(120);
    expect(capturedBody!.ddaIsBossBattle).toBe(true);
    expect(capturedBody!.ddaAdjustmentTrigger).toBe('session_end');
  });
});

describe('aggregateDDAEffectiveness', () => {
  it('should return zero metrics for empty events', () => {
    const result = aggregateDDAEffectiveness([], 300, false);

    expect(result.flowTimePercentage).toBe(0);
    expect(result.adjustmentCount).toBe(0);
    expect(result.completed).toBe(false);
    expect(result.averageFlowScore).toBe(0);
  });

  it('should calculate flow time percentage correctly', () => {
    const events: DDAAnalyticsEvent[] = [
      {
        sessionId: 'test',
        timestamp: 0,
        flowState: 'flow',
        wordsPerMinute: 5,
        successRate: 0.8,
        comboMaintenance: 3,
        timeInFlow: 60, // 60 seconds in flow
        intensityAdjustments: DEFAULT_INTENSITY,
        tier: 'normal',
        world: 1,
        level: 1,
        isBossBattle: false,
      },
    ];

    const result = aggregateDDAEffectiveness(events, 120, true); // 120 second session

    expect(result.flowTimePercentage).toBe(50); // 60/120 = 50%
    expect(result.completed).toBe(true);
  });

  it('should count adjustment triggers', () => {
    const events: DDAAnalyticsEvent[] = [
      {
        sessionId: 'test',
        timestamp: 0,
        flowState: 'frustrated',
        wordsPerMinute: 2,
        successRate: 0.5,
        comboMaintenance: 1,
        timeInFlow: 0,
        intensityAdjustments: DEFAULT_INTENSITY,
        tier: 'normal',
        world: 1,
        level: 1,
        isBossBattle: false,
        adjustmentTrigger: 'combo_break',
      },
      {
        sessionId: 'test',
        timestamp: 10000,
        flowState: 'learning',
        wordsPerMinute: 3,
        successRate: 0.6,
        comboMaintenance: 2,
        timeInFlow: 10,
        intensityAdjustments: DEFAULT_INTENSITY,
        tier: 'normal',
        world: 1,
        level: 1,
        isBossBattle: false,
        adjustmentTrigger: 'periodic',
      },
      {
        sessionId: 'test',
        timestamp: 20000,
        flowState: 'flow',
        wordsPerMinute: 5,
        successRate: 0.8,
        comboMaintenance: 3,
        timeInFlow: 30,
        intensityAdjustments: DEFAULT_INTENSITY,
        tier: 'normal',
        world: 1,
        level: 1,
        isBossBattle: false,
      },
    ];

    const result = aggregateDDAEffectiveness(events, 60, true);

    expect(result.adjustmentCount).toBe(2); // 2 events with triggers
  });

  it('should calculate average flow score', () => {
    const events: DDAAnalyticsEvent[] = [
      {
        sessionId: 'test', timestamp: 0, flowState: 'flow',
        wordsPerMinute: 5, successRate: 0.8, comboMaintenance: 3, timeInFlow: 0,
        intensityAdjustments: DEFAULT_INTENSITY, tier: 'normal', world: 1, level: 1, isBossBattle: false,
      },
      {
        sessionId: 'test', timestamp: 1000, flowState: 'learning',
        wordsPerMinute: 4, successRate: 0.7, comboMaintenance: 2, timeInFlow: 10,
        intensityAdjustments: DEFAULT_INTENSITY, tier: 'normal', world: 1, level: 1, isBossBattle: false,
      },
      {
        sessionId: 'test', timestamp: 2000, flowState: 'frustrated',
        wordsPerMinute: 2, successRate: 0.4, comboMaintenance: 1, timeInFlow: 10,
        intensityAdjustments: DEFAULT_INTENSITY, tier: 'normal', world: 1, level: 1, isBossBattle: false,
      },
    ];

    const result = aggregateDDAEffectiveness(events, 60, false);

    // flow=1, learning=0.5, frustrated=0 => (1 + 0.5 + 0) / 3 = 0.5
    expect(result.averageFlowScore).toBe(0.5);
  });

  it('should handle bored state in flow score calculation', () => {
    const events: DDAAnalyticsEvent[] = [
      {
        sessionId: 'test', timestamp: 0, flowState: 'bored',
        wordsPerMinute: 8, successRate: 0.95, comboMaintenance: 5, timeInFlow: 0,
        intensityAdjustments: DEFAULT_INTENSITY, tier: 'easy', world: 1, level: 1, isBossBattle: false,
      },
      {
        sessionId: 'test', timestamp: 1000, flowState: 'bored',
        wordsPerMinute: 9, successRate: 0.98, comboMaintenance: 6, timeInFlow: 0,
        intensityAdjustments: DEFAULT_INTENSITY, tier: 'easy', world: 1, level: 1, isBossBattle: false,
      },
    ];

    const result = aggregateDDAEffectiveness(events, 60, true);

    // bored=0, bored=0 => (0 + 0) / 2 = 0
    expect(result.averageFlowScore).toBe(0);
  });

  it('should handle zero session duration gracefully', () => {
    const events: DDAAnalyticsEvent[] = [
      {
        sessionId: 'test',
        timestamp: 0,
        flowState: 'flow',
        wordsPerMinute: 5,
        successRate: 0.8,
        comboMaintenance: 3,
        timeInFlow: 30,
        intensityAdjustments: DEFAULT_INTENSITY,
        tier: 'normal',
        world: 1,
        level: 1,
        isBossBattle: false,
      },
    ];

    const result = aggregateDDAEffectiveness(events, 0, false);

    expect(result.flowTimePercentage).toBe(0); // Avoid division by zero
  });
});
