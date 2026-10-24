import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase, logAudit } from '@/lib/db';
import { createSession } from '@/lib/auth';

// In-memory brute force protection: max 5 failed attempts per account/identifier within 15 minutes
interface LoginAttempt {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

function checkRateLimit(key: string): { blocked: boolean; remainingMinutes?: number } {
  const attempt = loginAttempts.get(key);
  if (!attempt) return { blocked: false };
  if (attempt.lockedUntil > Date.now()) {
    const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / (60 * 1000));
    return { blocked: true, remainingMinutes };
  }
  return { blocked: false };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    attempt.count = 0;
  }
  loginAttempts.set(key, attempt);
}

function resetAttempts(key: string) {
  loginAttempts.delete(key);
}

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please enter your email/phone and password.' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();

    // Check brute force lockout
    const rateLimit = checkRateLimit(cleanId);
    if (rateLimit.blocked) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. For your security, this account is temporarily locked for ${rateLimit.remainingMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const db = getDatabase();
    const digitsOnly = cleanId.replace(/\D/g, '').slice(-10);

    // Find user by email or phone (tolerant of +91, spaces, dashes)
    const user = db.users.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      if (uEmail === cleanId) return true;
      if (digitsOnly.length >= 10) {
        const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
        if (uDigits === digitsOnly) return true;
      }
      return false;
    });

    if (!user) {
      recordFailedAttempt(cleanId);
      const hasAdmin = db.users.some((u) => u.role === 'admin');
      if (!hasAdmin) {
        return NextResponse.json(
          {
            error: 'No Fleet Owner account has been configured yet. Please set up the Owner account first.',
            needsSetup: true,
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: 'Invalid credentials or account not found.' }, { status: 401 });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      recordFailedAttempt(cleanId);
      return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 401 });
    }

    // Reset failed attempts upon successful authentication
    resetAttempts(cleanId);

    // Check account status
    if (user.role === 'driver') {
      if (user.status === 'pending_approval') {
        return NextResponse.json({
          status: 'pending_approval',
          message: 'Your driver account has been registered and is waiting for Admin approval.',
          user: { name: user.name, email: user.email, role: user.role, status: user.status },
        });
      }

      if (user.status === 'suspended') {
        return NextResponse.json({
          status: 'suspended',
          error: 'Your driver account has been suspended. Please contact the fleet owner.',
          user: { name: user.name, email: user.email, role: user.role, status: user.status },
        }, { status: 403 });
      }

      if (user.status === 'rejected') {
        return NextResponse.json({
          status: 'rejected',
          error: 'Your registration was rejected. Please contact the fleet administrator.',
          user: { name: user.name, email: user.email, role: user.role, status: user.status },
        }, { status: 403 });
      }
    }

    // Active Admin or Approved Driver: create session cookie
    await createSession(user);

    logAudit(
      user.id,
      user.name,
      user.role,
      'USER_LOGIN',
      'Auth',
      `Successful login by ${user.role}: ${user.name} (${user.email}).`
    );

    return NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: `Server error processing login: ${err?.message || 'Internal error'}` }, { status: 500 });
  }
}
