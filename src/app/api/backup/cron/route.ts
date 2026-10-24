import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { performServerBackup } from '@/lib/backup';
import { getDatabase } from '@/lib/db';

export async function GET(request: Request) {
  // Allow execution via CRON secret header OR Admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'vahan360-cron-secret-2026';

  let isAuthorized = false;
  if (authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  } else {
    try {
      await requireAdmin();
      isAuthorized = true;
    } catch {}
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized CRON execution' }, { status: 401 });
  }

  try {
    const backupRecord = performServerBackup('scheduled_daily');
    const db = getDatabase();

    return NextResponse.json({
      success: true,
      message: 'Automated daily backup executed successfully.',
      backup: backupRecord,
      totalBackupsRetained: db.backups.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Backup job failed', details: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const backupRecord = performServerBackup('manual_txt');
    return NextResponse.json({
      success: true,
      message: 'Manual backup snapshot created successfully.',
      backup: backupRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Backup snapshot failed' }, { status: 500 });
  }
}
