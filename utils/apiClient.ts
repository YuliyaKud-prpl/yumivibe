import type { ApiError, ApiResponse } from '@/types/api';
import { loadFromStorage } from '@/utils/storage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const USE_MOCK = false;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

class ApiClientError extends Error {
  constructor(public apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiClientError';
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'));
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  mockData?: T,
): Promise<T> {
  if (USE_MOCK && mockData !== undefined) {
    await delay(300); // simulate latency
    return mockData;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (typeof window !== 'undefined') {
        const token = loadFromStorage<string>('yumivibe-auth-token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const options: RequestInit = {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      };

      const response = await fetch(`${BASE_URL}${path}`, options);

      if (!response.ok) {
        const errorBody = (await response.json()) as { error: ApiError };
        throw new ApiClientError(errorBody.error);
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const json = (await response.json()) as ApiResponse<T>;

      if (json.error) {
        throw new ApiClientError(json.error);
      }

      return json.data as T;
    } catch (err) {
      lastError = err;

      if (err instanceof ApiClientError) {
        throw err;
      }

      if (isNetworkError(err) && attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await delay(backoff);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export function apiGet<T>(path: string, mockData?: T): Promise<T> {
  return request<T>('GET', path, undefined, mockData);
}

export function apiPost<T>(path: string, body?: unknown, mockData?: T): Promise<T> {
  return request<T>('POST', path, body, mockData);
}

export function apiPatch<T>(path: string, body?: unknown, mockData?: T): Promise<T> {
  return request<T>('PATCH', path, body, mockData);
}

export function apiDelete<T = void>(path: string, mockData?: T): Promise<T> {
  return request<T>('DELETE', path, undefined, mockData);
}

export { ApiClientError, USE_MOCK };
