import { CLASSROOM_PRESETS, type ClassroomPresetId, type ClassroomPresetValues } from '@/lib/education/classroomPresets';
import type { ClassroomAccessibility } from '@/shared/types/classroom';
import type { PlayStyle } from '@/shared/utils/teamBattle';

export type PresetFields = Omit<ClassroomPresetValues, 'vocabularyCap'>;

type Translate = (key: string, params?: Record<string, string | number>) => string;

const PRESET_ORDER: ClassroomPresetId[] = ['friday-battle', 'sped', 'standard'];

const onFlags = (a: ClassroomAccessibility) =>
  Object.entries(a).filter(([, on]) => on).map(([k]) => k).sort().join(',');

/** The preset the launch will run, or null; round length is an override (sessions set their own), and the SPED word cap rides on this answer. */
export function matchingPreset(v: PresetFields): ClassroomPresetId | null {
  return PRESET_ORDER.find((id) => {
    const p = CLASSROOM_PRESETS[id];
    return p.boardSize === v.boardSize
      && p.minWordLength === v.minWordLength
      && p.playStyle === v.playStyle
      && (v.playStyle !== 'teams' || p.teamCount === v.teamCount)
      && onFlags(p.accessibility) === onFlags(v.accessibility);
  }) ?? null;
}

export function lobbySetupSummary(
  s: { playStyle: PlayStyle; teamCount: number; rivalry: boolean; roundMinutes: number },
  t: Translate,
): string {
  return [
    t(`teacher.classroom.playStyle.${s.playStyle}`),
    t(s.rivalry ? 'eduShell.host.rivalsOn' : 'eduShell.host.rivalsOff'),
    t('education.modePicker.minutes', { count: s.roundMinutes }),
  ].join(' · ');
}
