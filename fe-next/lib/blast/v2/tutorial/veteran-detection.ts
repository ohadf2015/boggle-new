export type BlastProgressSnapshot = { max_level_cleared?: number };

export function isVeteran(progress: BlastProgressSnapshot): boolean {
  return (progress.max_level_cleared ?? 0) >= 5;
}

export function getVeteranCardVariant(): 'welcome_back' | null {
  return 'welcome_back';
}
