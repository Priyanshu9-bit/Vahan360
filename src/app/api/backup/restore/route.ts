import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { validateTxtBackup, restoreFromValidatedBackup } from '@/lib/backup';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { fileContent } = await request.json();

    if (!fileContent || typeof fileContent !== 'string') {
      return NextResponse.json({ error: 'Please provide valid backup text content.' }, { status: 400 });
    }

    const validation = validateTxtBackup(fileContent);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Backup validation failed. Cannot restore.', details: validation.errors },
        { status: 400 }
      );
    }

    const result = restoreFromValidatedBackup(validation, { id: admin.id, name: admin.name });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      restoredCounts: result.restoredCounts,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json(
        { error: 'Access Denied: Only the authorized Fleet Owner (Admin) can restore database backups.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to restore database' }, { status: 500 });
  }
}
