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
    const { identifier, password, pin, loginMode } = await request.json();

    const cleanId = (identifier || '').trim().toLowerCase();

    // 1. Mandatory Identifier check
    if (!cleanId) {
      return NextResponse.json(
        { error: 'Please enter your registered email address or mobile number.' },
        { status: 400 }
      );
    }

    // 2. Brute-Force Rate Limiting Lockout
    const rateLimit = checkRateLimit(cleanId);
    if (rateLimit.blocked) {
      return NextResponse.json(
        {
          error: `Account locked due to multiple failed sign-in attempts. Please wait ${rateLimit.remainingMinutes} minute(s) before trying again to protect your account.`,
        },
        { status: 429 }
      );
    }

    const db = getDatabase();
    const admin = db.users.find((u) => u.role === 'admin');

    // 3. Credential presence validation
    if (loginMode === 'pin' && !pin) {
      return NextResponse.json({ error: 'Please enter your 6-digit Master Security PIN.' }, { status: 400 });
    }
    if (loginMode !== 'pin' && !password && !pin) {
      return NextResponse.json({ error: 'Please enter your password.' }, { status: 400 });
    }

    // 4. Strict user resolution (No default admin fallback)
    const cleanDigits = cleanId.replace(/\D/g, '');
    const user = db.users.find((u) => {
      // Email match
      const uEmail = (u.email || '').toLowerCase().trim();
      if (uEmail === cleanId) return true;

      // Full name match
      const uName = (u.name || '').toLowerCase().trim();
      if (uName === cleanId) return true;

      // Raw phone string match
      const uPhone = (u.phone || '').trim().toLowerCase();
      if (uPhone === cleanId) return true;

      // Digits-only match (country code tolerant)
      const uDigits = (u.phone || '').replace(/\D/g, '');
      if (cleanDigits.length >= 6 && uDigits.length >= 6) {
        if (cleanDigits === uDigits) return true;
        if (cleanDigits.endsWith(uDigits) || uDigits.endsWith(cleanDigits)) return true;
      }

      return false;
    }) || null;

    if (!user) {
      if (!admin) {
        return NextResponse.json(
          {
            error: 'No Fleet Owner account has been configured yet. Please set up the Owner account first.',
            needsSetup: true,
          },
          { status: 404 }
        );
      }
      recordFailedAttempt(cleanId);
      return NextResponse.json({ error: 'Invalid credentials or account not found.' }, { status: 401 });
    }

    // 5. Authenticate credentials with bcrypt
    let isMatch = false;
    if (loginMode === 'pin' || (pin && !password)) {
      if (!user.securityPinHash) {
        if (password && bcrypt.compareSync(password, user.passwordHash)) {
          isMatch = true;
        } else {
          return NextResponse.json(
            { error: 'Security PIN has not been set yet. Please sign in with your password and configure your PIN in Settings.' },
            { status: 400 }
          );
        }
      } else {
        isMatch = bcrypt.compareSync(String(pin).trim(), user.securityPinHash);
        if (!isMatch && password) {
          isMatch = bcrypt.compareSync(password, user.passwordHash);
        }
      }
    } else {
      isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch && user.securityPinHash) {
        isMatch = bcrypt.compareSync(password.trim(), user.securityPinHash);
      }
    }

    if (!isMatch) {
      recordFailedAttempt(cleanId);
      try {
        logAudit(
          user.id,
          user.name,
          user.role,
          'LOGIN_FAILED',
          'Auth',
          `Failed authentication attempt for ${user.role} "${user.name}" (${cleanId}).`
        );
      } catch {}
      return NextResponse.json({ error: 'Invalid credentials. Please verify your password and try again.' }, { status: 401 });
    }

    // Successful login: reset failed counter
    resetAttempts(cleanId);

    // 5. Check account status for drivers:
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

    // 6. Active Admin or Approved Driver: create session cookie
    await createSession(user);

    try {
      logAudit(
        user.id,
        user.name,
        user.role,
        'USER_LOGIN',
        'Auth',
        `Successful login by ${user.role}: ${user.name} (${user.email}).`
      );
    } catch {}

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
