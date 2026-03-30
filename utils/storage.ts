const PREFIX = 'yumivibe-';
export const DASHBOARDS_KEY = `${PREFIX}dashboards`;

export function dashboardKey(id: string): string {
  return `${PREFIX}dashboard-${id}`;
}

export function userDashboardsKey(userId: string): string {
  return `${PREFIX}user-${userId}-dashboards`;
}

export function loadFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Swallow quota errors
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Swallow errors
  }
}
