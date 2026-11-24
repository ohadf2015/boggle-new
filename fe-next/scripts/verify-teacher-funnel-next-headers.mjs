import { AsyncLocalStorage } from 'node:async_hooks';

const shared = globalThis;
if (!shared.__teacherFunnelRequestStore) {
  shared.__teacherFunnelRequestStore = new AsyncLocalStorage();
}
export const requestStore = shared.__teacherFunnelRequestStore;

function store() {
  return requestStore.getStore() ?? { jar: new Map(), headerMap: new Map() };
}

export async function cookies() {
  const current = store();
  return {
    getAll() {
      return [...current.jar.entries()].map(([name, value]) => ({ name, value }));
    },
    get(name) {
      const value = current.jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name, value) {
      current.jar.set(name, value);
    },
    has(name) {
      return current.jar.has(name);
    },
  };
}

export async function headers() {
  const current = store();
  return {
    get(name) {
      return current.headerMap.get(name.toLowerCase()) ?? null;
    },
    has(name) {
      return current.headerMap.has(name.toLowerCase());
    },
    entries() {
      return current.headerMap.entries();
    },
  };
}
