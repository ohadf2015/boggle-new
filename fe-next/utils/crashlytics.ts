import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

type Primitive = string | number | boolean;

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function initCrashlytics(userId?: string): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: true });
    if (userId) {
      await FirebaseCrashlytics.setUserId({ userId });
    }
    await FirebaseCrashlytics.setCustomKey({
      key: 'platform',
      value: Capacitor.getPlatform(),
      type: 'string',
    });
  } catch {
    // Monitoring setup must never crash launch.
  }
}

export async function recordNativeError(
  error: Error,
  context?: Record<string, Primitive>
): Promise<void> {
  if (!isNative()) return;
  try {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        const type =
          typeof value === 'number'
            ? ('double' as const)
            : typeof value === 'boolean'
              ? ('boolean' as const)
              : ('string' as const);
        await FirebaseCrashlytics.setCustomKey({ key, value: String(value), type });
      }
    }
    await FirebaseCrashlytics.recordException({
      message: error.message,
      stacktrace: error.stack
        ? error.stack.split('\n').map((line) => ({ fileName: line.trim() }))
        : undefined,
    });
  } catch {
    // Swallow — never let monitoring crash the app.
  }
}

export async function logBreadcrumb(message: string): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseCrashlytics.log({ message });
  } catch {
    /* swallow */
  }
}
