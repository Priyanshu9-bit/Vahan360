import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const db = getDatabase();
    let driverProfile = null;
    if (user.role === 'driver') {
      driverProfile = db.drivers.find((d) => d.userId === user.id) || null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      driver: driverProfile,
      business: {
        name: db.settings.businessName,
        tagline: db.settings.tagline,
        ownerName: db.settings.ownerName,
        currency: db.settings.currency,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}
