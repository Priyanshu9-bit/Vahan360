import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, transferAdminOwnership, logAudit } from '@/lib/db';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = getDatabase();

    return NextResponse.json({
      settings: db.settings,
      adminUser: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { action } = body;
    const db = getDatabase();

    if (action === 'transfer_ownership') {
      const { newName, newEmail, newPhone, newPassword } = body;
      if (!newName || !newEmail || !newPhone || !newPassword) {
        return NextResponse.json(
          { error: 'All fields (Name, Email, Phone, Password) are required for transferring ownership.' },
          { status: 400 }
        );
      }

      const result = transferAdminOwnership(admin.id, {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        password: newPassword,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Business ownership transferred successfully.',
        newAdmin: result.newAdmin,
      });
    }

    // General settings update
    const { businessName, tagline, phone, email, address, gstin, language, autoBackupEnabled } = body;
    if (businessName) db.settings.businessName = businessName.trim();
    if (tagline) db.settings.tagline = tagline.trim();
    if (phone) db.settings.phone = phone.trim();
    if (email) db.settings.email = email.trim();
    if (address) db.settings.address = address.trim();
    if (gstin !== undefined) db.settings.gstin = gstin.trim().toUpperCase();
    if (language) db.settings.language = language;
    if (autoBackupEnabled !== undefined) db.settings.autoBackupEnabled = Boolean(autoBackupEnabled);

    db.settings.updatedAt = new Date().toISOString();

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'UPDATE_SETTINGS',
      'Settings',
      `Updated business settings for ${db.settings.businessName}`
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, settings: db.settings });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
