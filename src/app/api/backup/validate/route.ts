import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { validateTxtBackup } from '@/lib/backup';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { fileContent } = await request.json();

    if (!fileContent || typeof fileContent !== 'string') {
      return NextResponse.json({ error: 'Please provide valid backup text content.' }, { status: 400 });
    }

    const validation = validateTxtBackup(fileContent);

    return NextResponse.json({
      valid: validation.valid,
      version: validation.version,
      businessName: validation.businessName,
      counts: validation.counts,
      errors: validation.errors,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
