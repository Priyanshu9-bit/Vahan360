import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, logAudit } from '@/lib/db';
import { generateFullTxtBackup } from '@/lib/backup';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = getDatabase();

    const { content, filename, checksum } = generateFullTxtBackup(db);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'DOWNLOAD_TXT_BACKUP',
      'Backup',
      `Admin downloaded full TXT backup: ${filename} (Checksum: ${checksum.slice(0, 12)}...)`
    );

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Backup-Checksum': checksum,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      try {
        const { getSessionUser } = await import('@/lib/auth');
        const user = await getSessionUser();
        if (user) {
          logAudit(
            user.id,
            user.name,
            user.role,
            'UNAUTHORIZED_BACKUP_ACCESS_ATTEMPT',
            'Security',
            `Driver "${user.name}" attempted unauthorized access to download TXT backup.`
          );
        }
      } catch {}
      return NextResponse.json(
        { error: 'Access Denied: Only the authorized Fleet Owner (Admin) can download system backups.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate TXT backup' }, { status: 500 });
  }
}
