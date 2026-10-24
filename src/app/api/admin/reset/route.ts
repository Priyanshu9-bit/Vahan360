import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin, destroySession } from '@/lib/auth';
import { resetDatabaseToEmpty, logAudit } from '@/lib/db';
import { saveToMongo, isMongoConfigured } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Admin password is required to authorize a complete system factory reset.' },
        { status: 400 }
      );
    }

    const isMatch = bcrypt.compareSync(password, admin.passwordHash);
    if (!isMatch) {
      logAudit(
        admin.id,
        admin.name,
        'admin',
        'FACTORY_RESET_FAILED_AUTH',
        'Security',
        'Failed factory reset authorization: incorrect password entered.'
      );
      return NextResponse.json(
        { error: 'Incorrect admin password. Factory reset aborted.' },
        { status: 401 }
      );
    }

    // Perform clean reset
    const emptyDb = resetDatabaseToEmpty();

    // Ensure MongoDB Atlas is immediately synchronized if configured
    if (isMongoConfigured()) {
      await saveToMongo(emptyDb);
    }

    // Terminate current admin session
    await destroySession();

    return NextResponse.json({
      success: true,
      message: 'System and database have been completely reset to factory clean state. Redirecting to setup...',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json(
        { error: 'Unauthorized: Only the authorized Fleet Owner can initiate a factory reset.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to execute system factory reset.' }, { status: 500 });
  }
}
