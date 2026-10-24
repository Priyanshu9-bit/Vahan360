import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, logAudit } from '@/lib/db';
import { generateMasterExcelWorkbook } from '@/lib/excel';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = getDatabase();

    const { buffer, filename } = generateMasterExcelWorkbook(db);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'EXPORT_EXCEL_WORKBOOK',
      'Backup',
      `Admin exported master fleet Excel spreadsheet: ${filename}`
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate Excel spreadsheet' }, { status: 500 });
  }
}
