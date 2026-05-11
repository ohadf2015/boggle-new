import { Capacitor } from '@capacitor/core';
import { createNativeStore, createWebStore, type OfflineStore } from './storage';
import { runMigrations } from './migrations';

const WEB_DB_NAME = 'lexiclash-offline';

let cached: Promise<OfflineStore> | null = null;

async function build(): Promise<OfflineStore> {
  const store = Capacitor.isNativePlatform()
    ? await createNativeStore()
    : await createWebStore({ dbName: WEB_DB_NAME });
  await runMigrations(store);
  return store;
}

export function getOfflineStore(): Promise<OfflineStore> {
  if (!cached) cached = build();
  return cached;
}

export async function __resetOfflineStore(): Promise<void> {
  if (cached) {
    const store = await cached;
    await store.close?.();
    cached = null;
  }
}

export type { OfflineStore } from './storage';
