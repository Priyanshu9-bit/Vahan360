import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { isMongoConfigured, getMongoDb, saveToMongo, loadFromMongo } from '@/lib/mongodb';
import { getDatabase, logAudit } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();

    const configured = isMongoConfigured();
    if (!configured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'MongoDB Atlas is not configured. Using high-speed local filesystem storage.',
      });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({
        configured: true,
        connected: false,
        error: 'Could not connect to MongoDB Atlas. Please check network connectivity or MONGODB_URI.',
      });
    }

    // Ping MongoDB to test connectivity
    await db.command({ ping: 1 });
    const cloudSnapshot = await loadFromMongo();

    return NextResponse.json({
      configured: true,
      connected: true,
      databaseName: db.databaseName,
      hasCloudData: Boolean(cloudSnapshot),
      cloudLastSaved: cloudSnapshot?.updatedAt || null,
      cloudVehiclesCount: cloudSnapshot?.vehicles?.length || 0,
      cloudTripsCount: cloudSnapshot?.trips?.length || 0,
      cloudDriversCount: cloudSnapshot?.drivers?.length || 0,
      message: 'MongoDB Atlas cloud database connected and active.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ configured: isMongoConfigured(), connected: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: 'MongoDB Atlas URI is not configured in environment variables (MONGODB_URI).' },
        { status: 400 }
      );
    }

    if (action === 'sync_now') {
      const localDb = getDatabase();
      const success = await saveToMongo(localDb);
      if (!success) {
        return NextResponse.json({ error: 'Failed to write snapshot to MongoDB Atlas.' }, { status: 500 });
      }

      logAudit(
        admin.id,
        admin.name,
        'admin',
        'MONGODB_MANUAL_SYNC',
        'Database',
        'Manual database snapshot synchronized to MongoDB Atlas cloud.'
      );

      return NextResponse.json({
        success: true,
        message: 'All local fleet data, vehicles, trips, and driver ledgers successfully backed up to MongoDB Atlas cloud!',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
