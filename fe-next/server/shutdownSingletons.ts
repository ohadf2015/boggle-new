import { rateLimiterInstance } from '../backend/utils/rateLimiter';
import { shutdownApiRateLimiter } from '../backend/utils/apiRateLimiter';
import { spamDetector } from '../backend/modules/spamDetector';
import { lifecycleLogger } from './logger';

export function shutdownInMemorySingletons(): void {
  try {
    rateLimiterInstance.shutdown();
  } catch (err) {
    lifecycleLogger.error({ err }, 'Error shutting down socket rate limiter');
  }
  try {
    shutdownApiRateLimiter();
  } catch (err) {
    lifecycleLogger.error({ err }, 'Error shutting down API rate limiter');
  }
  try {
    spamDetector.shutdown();
  } catch (err) {
    lifecycleLogger.error({ err }, 'Error shutting down spam detector');
  }
}
