/**
 * Conversational GC add-on planner — routes plain language into shipped modes.
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GAP_ORIGIN, CLASS_GAP_RETEACH_TIMER_SECONDS } from '../classGapShare';
import {
  CLASSROOM_ADDON_PLANNER_FOIL,
  CLASSROOM_ADDON_PLANNER_PATH,
  CLASSROOM_ADDON_PLAN_API_PATH,
  buildClassroomAddonPlan,
  buildClassroomAddonPlannerUrl,
  detectClassroomAddonPlanMode,
  classroomAddonPlannerListingSlice,
} from '../classroomAddonPlanner';

describe('detectClassroomAddonPlanMode', () => {
  it('routes Unplugged reteach / yesterday misses', () => {
    expect(
      detectClassroomAddonPlanMode("Unplugged reteach on yesterday's misses"),
    ).toBe('unplugged_reteach');
  });

  it('routes 3-min Live on CEFR gaps', () => {
    expect(detectClassroomAddonPlanMode('3-min Live on CEFR gaps')).toBe(
      'reteach_live_3min',
    );
  });

  it('routes Classic Unplugged', () => {
    expect(detectClassroomAddonPlanMode('Classic Unplugged with the class')).toBe(
      'classic_unplugged',
    );
  });

  it('routes Team Tiles', () => {
    expect(detectClassroomAddonPlanMode('Team Tiles for two groups')).toBe(
      'team_tiles_unplugged',
    );
  });
});

describe('buildClassroomAddonPlan', () => {
  it('plans Unplugged reteach + grade passback from a plain-language prompt', () => {
    const result = buildClassroomAddonPlan({
      prompt: "Unplugged reteach on yesterday's misses",
      missed_words: ['neutron', 'quark'],
      lesson: 'Physics 101',
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('unplugged_reteach');
    expect(result.liveUrl).toContain('/education/unplugged-reteach');
    expect(result.liveUrl).toContain('neutron');
    expect(result.gradePassbackUrl).toContain('/education/unplugged-grade-passback');
    expect(result.streamAssignUrl).toContain('classroom.google.com/share');
    expect(result.foil).toBe(CLASSROOM_ADDON_PLANNER_FOIL);
    expect(result.student_names).toBe(false);
    expect(JSON.stringify(result)).not.toContain('Maya');
    expect(JSON.stringify(result)).not.toContain('lexiclash.com');
  });

  it('plans 3-min CEFR Live and seeds gap words when none provided', () => {
    const result = buildClassroomAddonPlan({
      prompt: '3-min Live on CEFR A2 gaps',
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('reteach_live_3min');
    expect(result.timer_seconds).toBe(CLASS_GAP_RETEACH_TIMER_SECONDS);
    expect(result.cefr_level).toBe('A2');
    expect(result.missed_words.length).toBeGreaterThan(0);
    expect(result.liveUrl).toContain('/education/unplugged-reteach');
    expect(result.gradePassbackUrl).toContain('unplugged-grade-passback');
  });

  it('plans Classic Unplugged without reopening game logic', () => {
    const result = buildClassroomAddonPlan({
      prompt: 'Classic Unplugged — class discuss yesterday misses',
      missed_words: ['atom', 'orbit'],
      locale: 'es',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('classic_unplugged');
    expect(result.liveUrl).toContain('/es/education/classic-unplugged');
    expect(result.livePath).toContain('/education/classic-unplugged');
    expect(result.gradePassbackUrl).toContain(CLASS_GAP_ORIGIN);
  });

  it('plans Team Tiles Unplugged', () => {
    const result = buildClassroomAddonPlan({
      prompt: 'Team Tiles for two groups on missed words',
      missed_words: ['chlorophyll'],
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('team_tiles_unplugged');
    expect(result.liveUrl).toContain('/education/team-tiles-unplugged');
  });

  it('rejects student names / roster fields', () => {
    const result = buildClassroomAddonPlan({
      prompt: 'Unplugged reteach',
      missed_words: ['neutron'],
      student_names: ['Maya'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not accepted/i);
  });

  it('requires a prompt', () => {
    const result = buildClassroomAddonPlan({ missed_words: ['neutron'] });
    expect(result.ok).toBe(false);
  });

  it('requires missed words when CEFR is not implied', () => {
    const result = buildClassroomAddonPlan({
      prompt: "Unplugged reteach on yesterday's misses",
    });
    expect(result.ok).toBe(false);
  });
});

describe('buildClassroomAddonPlannerUrl', () => {
  it('registers the planner URI on lexiclash.live', () => {
    const url = buildClassroomAddonPlannerUrl({
      locale: 'en',
      context: { courseId: '123', addOnToken: 'tok' },
      prompt: '3-min Live on CEFR gaps',
    });
    expect(url).toContain(`${CLASS_GAP_ORIGIN}/en${CLASSROOM_ADDON_PLANNER_PATH}`);
    expect(url).toContain('courseId=123');
    expect(url).toContain('addOnToken=tok');
    expect(url).toContain('prompt=');
    expect(url).not.toContain('lexiclash.com');
  });
});

describe('classroomAddonPlannerListingSlice', () => {
  it('publishes planner metadata without roster scopes', () => {
    const slice = classroomAddonPlannerListingSlice();
    expect(slice.foil).toBe(CLASSROOM_ADDON_PLANNER_FOIL);
    expect(slice.api).toBe(CLASSROOM_ADDON_PLAN_API_PATH);
    expect(slice.reopens_unplugged_game_logic).toBe(false);
    expect(slice.student_names).toBe(false);
    expect(JSON.stringify(slice)).not.toContain('lexiclash.com');
  });
});
