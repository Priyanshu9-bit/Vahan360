import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/db';
import { generateDocumentsZip, getBackupTimestamp } from '@/lib/backup';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const zipBuffer = await generateDocumentsZip();
    const filename = `Vahan360_Master_Fleet_Archive_${getBackupTimestamp()}.zip`;

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'DOWNLOAD_MASTER_ARCHIVE_ZIP',
      'Backup',
      `Admin downloaded master fleet archive ZIP: ${filename} (${zipBuffer.byteLength} bytes)`
    );

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
            `Driver "${user.name}" attempted unauthorized access to download documents ZIP backup.`
          );
        }
      } catch {}
      return NextResponse.json(
        { error: 'Access Denied: Only the authorized Fleet Owner (Admin) can download document backups.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate documents ZIP backup' }, { status: 500 });
  }
}
