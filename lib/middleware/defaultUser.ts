import type { AuthPayload } from '@/types/user';

export const DEFAULT_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export function getDefaultUser(): AuthPayload {
  return { userId: DEFAULT_USER_ID, role: 'admin' };
}
