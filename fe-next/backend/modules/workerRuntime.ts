/**
 * Worker Runtime Abstraction
 * Provides a unified API for workers across Node.js and Bun runtimes
 */

// Detect runtime environment
declare const Bun: { Worker: new (path: string) => BunWorkerInstance } | undefined;
export const isBun = typeof Bun !== 'undefined';
export const isNode = !isBun && typeof process !== 'undefined' && process.versions?.node;

export interface WorkerEventMap {
  message: [data: unknown];
  error: [err: Error];
  exit: [code: number];
}

export interface WorkerLike {
  postMessage(data: unknown): void;
  terminate(): Promise<number> | void;
  on<E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void): void;
  once<E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void): void;
}

export interface ParentPortLike {
  postMessage(data: unknown): void;
  on(event: 'message', listener: (data: unknown) => void): void;
}

// Type definitions for Bun worker
interface BunWorkerInstance {
  postMessage(data: unknown): void;
  terminate(): void;
  addEventListener(event: 'message', listener: (e: MessageEvent) => void): void;
  addEventListener(event: 'error', listener: (e: ErrorEvent) => void): void;
  addEventListener(event: 'close', listener: (e: Event) => void): void;
  removeEventListener(event: string, listener: (e: Event) => void): void;
}

interface BunWorkerSelf {
  postMessage(data: unknown): void;
  addEventListener(event: string, listener: (e: MessageEvent) => void): void;
}

/**
 * Creates a worker that works in both Node.js and Bun
 */
export async function createWorker(workerPath: string): Promise<WorkerLike> {
  if (isBun && Bun) {
    // Bun Worker
    const bunWorker = new Bun.Worker(workerPath);

    // Wrap Bun worker to match Node.js worker_threads API
    const worker: WorkerLike = {
      postMessage: (data: unknown) => bunWorker.postMessage(data),
      terminate: () => bunWorker.terminate(),
      on: <E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void) => {
        if (event === 'message') {
          bunWorker.addEventListener('message', (e: MessageEvent) =>
            (listener as (...args: WorkerEventMap['message']) => void)(e.data)
          );
        } else if (event === 'error') {
          bunWorker.addEventListener('error', (e: ErrorEvent) =>
            (listener as (...args: WorkerEventMap['error']) => void)(new Error(e.message))
          );
        } else if (event === 'exit') {
          // Bun doesn't have native exit event, we simulate it on close
          bunWorker.addEventListener('close', () =>
            (listener as (...args: WorkerEventMap['exit']) => void)(0)
          );
        }
      },
      once: <E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void) => {
        if (event === 'exit') {
          const handler = () => {
            (listener as (...args: WorkerEventMap['exit']) => void)(0);
            bunWorker.removeEventListener('close', handler);
          };
          bunWorker.addEventListener('close', handler);
        }
      }
    };
    return worker;
  } else {
    // Node.js Worker
    const { Worker } = await import('worker_threads');
    const nodeWorker = new Worker(workerPath);

    const worker: WorkerLike = {
      postMessage: (data: unknown) => nodeWorker.postMessage(data),
      terminate: () => nodeWorker.terminate(),
      on: <E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void) => {
        nodeWorker.on(event, listener as (...args: unknown[]) => void);
      },
      once: <E extends keyof WorkerEventMap>(event: E, listener: (...args: WorkerEventMap[E]) => void) => {
        nodeWorker.once(event, listener as (...args: unknown[]) => void);
      }
    };
    return worker;
  }
}

/**
 * Gets the parent port for the current worker context
 * Works in both Node.js and Bun
 */
export async function getParentPort(): Promise<ParentPortLike | null> {
  if (isBun) {
    // In Bun, the worker uses self for communication
    const selfWorker = globalThis as unknown as BunWorkerSelf;
    if (selfWorker.postMessage) {
      return {
        postMessage: (data: unknown) => selfWorker.postMessage(data),
        on: (event: 'message', listener: (data: unknown) => void) => {
          if (event === 'message') {
            selfWorker.addEventListener('message', (e: MessageEvent) => listener(e.data));
          }
        }
      };
    }
    return null;
  } else {
    // Node.js worker_threads
    try {
      const { parentPort } = await import('worker_threads');
      if (parentPort) {
        return {
          postMessage: (data: unknown) => parentPort.postMessage(data),
          on: (event: 'message', listener: (data: unknown) => void) => {
            parentPort.on(event, listener);
          }
        };
      }
    } catch {
      // Not in a worker context
    }
    return null;
  }
}
