interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

const cleanup = (): void => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
};

export const get = <T>(key: string): T | undefined => {
  cleanup();

  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value as T;
};

export const set = <T>(key: string, value: T, ttlMs: number): void => {
  cleanup();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const has = (key: string): boolean => {
  const entry = store.get(key);
  if (!entry) return false;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return false;
  }

  return true;
};

export const del = (key: string): boolean => {
  return store.delete(key);
};

export const clear = (): void => {
  store.clear();
};

export const WEATHER_TTL_MS = 15 * 60 * 1000;
export const UNSPLASH_TTL_MS = 10 * 60 * 1000;
