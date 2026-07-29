// circuitBreaker.ts - Circuit breaker pattern implementation

import type { CircuitBreakerState } from './types';

import logger from '../utils/logger';

export class CircuitBreaker {
  private failureCount: number;
  private threshold: number;
  private timeout: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  private nextAttempt: number;

  constructor(threshold: number = 5, timeout: number = 10000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - Redis operations suspended');
      }
      this.state = 'HALF_OPEN';
      logger.info('REDIS', 'Circuit breaker entering HALF_OPEN state');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      logger.info('REDIS', 'Circuit breaker recovered - entering CLOSED state');
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(
        'REDIS',
        `Circuit breaker OPENED after ${this.failureCount} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? this.nextAttempt : null,
    };
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreaker();
