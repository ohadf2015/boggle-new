import { useExperiment } from '@/hooks/useExperiment';

export function useJellyEnabled(): boolean {
  return useExperiment('blast.jelly').variant === 'treatment';
}

export function useCakeEnabled(): boolean {
  return useExperiment('blast.cake').variant === 'treatment';
}

export function useChocolateEnabled(): boolean {
  return useExperiment('blast.chocolate').variant === 'treatment';
}
