import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase, logAudit } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please enter your email/phone and password.' }, { status: 400 });
    }

    const db = getDatabase();
    const cleanId = identifier.trim().toLowerCase();

    // Find user by email or phone
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')
    );

    if (!user) {
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
      return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 401 });
    }

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
    return NextResponse.json({ error: 'Server error processing login.' }, { status: 500 });
  }
}
