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

    const db = getDatabase();
    const admin = db.users.find((u) => u.role === 'admin');
    const cleanId = (identifier || '').trim().toLowerCase();

    // 1. PIN mode validation
    if (loginMode === 'pin' && !pin) {
      return NextResponse.json({ error: 'Please enter your 6-digit Master Security PIN.' }, { status: 400 });
    }

    // 2. Password mode validation
    if (loginMode !== 'pin' && !password && !pin) {
      return NextResponse.json({ error: 'Please enter your password or Security PIN.' }, { status: 400 });
    }

    // 3. User resolution:
    // In PIN mode, if identifier is omitted or says 'admin'/'owner', default to the Fleet Admin
    let user = null;
    if ((loginMode === 'pin' && (!cleanId || cleanId === 'admin' || cleanId === 'owner')) || cleanId === 'admin' || cleanId === 'owner') {
      user = admin || null;
    }

    // Otherwise, search all users with maximum tolerance:
    if (!user && cleanId) {
      const cleanDigits = cleanId.replace(/\D/g, '');
      user = db.users.find((u) => {
        // Email match
        const uEmail = (u.email || '').toLowerCase().trim();
        if (uEmail === cleanId) return true;

        // Full name match
        const uName = (u.name || '').toLowerCase().trim();
        if (uName === cleanId) return true;

        // Raw phone string match
        const uPhone = (u.phone || '').trim().toLowerCase();
        if (uPhone === cleanId) return true;

        // Digits-only match (tolerant of country codes, prefixes, 9-12 digits)
        const uDigits = (u.phone || '').replace(/\D/g, '');
        if (cleanDigits.length >= 6 && uDigits.length >= 6) {
          if (cleanDigits === uDigits) return true;
          if (cleanDigits.endsWith(uDigits) || uDigits.endsWith(cleanDigits)) return true;
        }

        return false;
      }) || null;
    }

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
      return NextResponse.json({ error: 'Invalid credentials or account not found.' }, { status: 401 });
    }

    // 4. Authenticate credentials:
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
        if (!isMatch) {
          if (password && bcrypt.compareSync(password, user.passwordHash)) {
            isMatch = true;
          } else {
            return NextResponse.json({ error: 'Incorrect 6-digit Security PIN. Please try again.' }, { status: 401 });
          }
        }
      }
    } else {
      isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) {
        // Also check if user entered their PIN in the password box by mistake
        if (user.securityPinHash && bcrypt.compareSync(password.trim(), user.securityPinHash)) {
          isMatch = true;
        } else {
          return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 401 });
        }
      }
    }

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
