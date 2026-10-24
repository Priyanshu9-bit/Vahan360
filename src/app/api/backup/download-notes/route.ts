import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, logAudit } from '@/lib/db';
import { generateTransactionsNote } from '@/lib/backup';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = getDatabase();

    const { content, filename } = generateTransactionsNote(db);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'DOWNLOAD_TRANSACTION_NOTES',
      'Backup',
      `Admin downloaded clean human-readable transaction notes: ${filename}`
    );

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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
            `User "${user.name}" attempted unauthorized access to download transaction notes.`
          );
        }
      } catch {}
      return NextResponse.json(
        { error: 'Access Denied: Only the authorized Fleet Owner (Admin) can download transaction notes.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate transaction notes' }, { status: 500 });
  }
}
