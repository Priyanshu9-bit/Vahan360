import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getDatabase, logAudit } from './db';
import { User } from '@/types';

const SESSION_COOKIE_NAME = 'vahan360_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'vahan360-fleet-secure-key-2026-prod-jwt-secret';

interface SessionPayload {
  userId: string;
  role: 'admin' | 'driver';
  email: string;
  expiresAt: number;
}

// Simple signed token mechanism without heavy native deps
function signToken(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString('base64');
  // Simple signature hash
  const signature = Buffer.from(`${base64}:${SESSION_SECRET}`).toString('base64');
  return `${base64}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;
    const expectedSignature = Buffer.from(`${base64}:${SESSION_SECRET}`).toString('base64');
    if (signature !== expectedSignature) return null;
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: User): Promise<string> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    expiresAt,
  };

  const token = signToken(payload);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const db = getDatabase();
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user) return null;

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== 'admin' || user.status !== 'active') {
    throw new Error('FORBIDDEN_ADMIN_ONLY');
  }
  return user;
}

export async function requireApprovedDriver(): Promise<{ user: User; driver: any }> {
  const user = await requireAuth();
  if (user.role !== 'driver') {
    throw new Error('FORBIDDEN_DRIVER_ONLY');
  }
  if (user.status === 'pending_approval') {
    throw new Error('APPROVAL_PENDING');
  }
  if (user.status !== 'active') {
    throw new Error('ACCESS_RESTRICTED');
  }

  const db = getDatabase();
  const driver = db.drivers.find((d) => d.userId === user.id);
  if (!driver) {
    throw new Error('DRIVER_PROFILE_NOT_FOUND');
  }

  return { user, driver };
}
