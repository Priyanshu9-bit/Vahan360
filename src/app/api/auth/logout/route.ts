import { NextResponse } from 'next/server';
import { destroySession, getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/db';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      logAudit(user.id, user.name, user.role, 'USER_LOGOUT', 'Auth', `User logged out: ${user.name}`);
    }
    await destroySession();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
