import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { query } from '@/lib/db';
import { AppError } from '@/lib/utils/AppError';

const JWT_SECRET_KEY = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw AppError.internal('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
};

const JWT_EXPIRES_IN = '7d';
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface TokenPayload extends JWTPayload {
  userId: string;
  role: string;
}

const toSafeUser = (row: UserRow): SafeUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const hashPassword = (password: string): string => {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    cost: SCRYPT_COST,
  }).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (
  password: string,
  storedHash: string
): boolean => {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    cost: SCRYPT_COST,
  });
  const storedBuffer = Buffer.from(hash, 'hex');
  return timingSafeEqual(derived, storedBuffer);
};

const generateToken = async (
  userId: string,
  role: string
): Promise<string> => {
  const token = await new SignJWT({ userId, role } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET_KEY());
  return token;
};

export const register = async (
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: SafeUser; token: string }> => {
  try {
    const existing = await query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (existing.rows.length > 0) {
      throw AppError.validation('Email already registered', {
        field: 'email',
      });
    }

    const passwordHash = hashPassword(password);
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, passwordHash, displayName ?? 'User']
    );

    const user = toSafeUser(result.rows[0]);
    const token = await generateToken(user.id, user.role);
    return { user, token };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to register user');
  }
};

export const login = async (
  email: string,
  password: string
): Promise<{ user: SafeUser; token: string }> => {
  try {
    const result = await query<UserRow>(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const row = result.rows[0];
    const isValid = verifyPassword(password, row.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const user = toSafeUser(row);
    const token = await generateToken(user.id, user.role);
    return { user, token };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to log in');
  }
};

export const getUserById = async (id: string): Promise<SafeUser> => {
  try {
    const result = await query<UserRow>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      throw AppError.unauthorized('User not found');
    }
    return toSafeUser(result.rows[0]);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to get user');
  }
};

interface UserUpdates {
  displayName?: string;
  email?: string;
  password?: string;
}

export const updateUser = async (
  id: string,
  updates: UserUpdates
): Promise<SafeUser> => {
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    const addField = (column: string, value: unknown): void => {
      setClauses.push(`${column} = $${paramIdx}`);
      values.push(value);
      paramIdx += 1;
    };

    if (updates.displayName !== undefined)
      addField('display_name', updates.displayName);
    if (updates.email !== undefined) addField('email', updates.email);
    if (updates.password !== undefined)
      addField('password_hash', hashPassword(updates.password));

    if (setClauses.length === 0) {
      return getUserById(id);
    }

    const result = await query<UserRow>(
      `UPDATE users SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      throw AppError.unauthorized('User not found');
    }

    return toSafeUser(result.rows[0]);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to update user');
  }
};

export const verifyToken = async (
  token: string
): Promise<{ userId: string; role: string }> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY());
    const claims = payload as TokenPayload;
    if (!claims.userId || !claims.role) {
      throw AppError.unauthorized('Invalid token payload');
    }
    return { userId: claims.userId, role: claims.role };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
};
