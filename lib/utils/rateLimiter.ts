interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

const cleanup = (): void => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
};

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
};

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 86_400_000;

export const checkGeminiLimit = (clientKey = 'gemini'): RateLimitResult =>
  checkRateLimit(clientKey, 15, ONE_MINUTE_MS);

export const checkUnsplashLimit = (clientKey = 'unsplash'): RateLimitResult =>
  checkRateLimit(clientKey, 50, ONE_HOUR_MS);

export const checkWeatherLimit = (clientKey = 'weather'): RateLimitResult =>
  checkRateLimit(clientKey, 1000, ONE_DAY_MS);

export const resetRateLimits = (): void => {
  store.clear();
};
