export type PracticeWheelRetryVariant = 'control' | 'retry-cta';

export function shouldShowRetryCta(variant: PracticeWheelRetryVariant): boolean {
  return variant === 'retry-cta';
}
