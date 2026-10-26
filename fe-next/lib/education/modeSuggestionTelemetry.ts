import { safeCapture } from '@/lib/education/telemetryCore';

export interface ModeSuggestionProps {
  suggestedMode: string;
  selectedMode: string;
  rehearsing: boolean;
}

function props(p: ModeSuggestionProps) {
  return { suggested_mode: p.suggestedMode, selected_mode: p.selectedMode, rehearsing: p.rehearsing };
}

export function trackModeSuggestionShown(p: ModeSuggestionProps): void {
  safeCapture('edu_mode_suggestion_shown', props(p));
}

export function trackModeSuggestionAccepted(p: ModeSuggestionProps): void {
  safeCapture('edu_mode_suggestion_accepted', props(p));
}
