import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase, saveDatabase, canCreateAdmin, logAudit } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { User } from '@/types';

export async function GET() {
  try {
    const canSetup = canCreateAdmin();
    const db = getDatabase();
    return NextResponse.json({
      canSetup,
      adminExists: !canSetup,
      businessName: db.settings?.businessName || 'Vahan360 Fleet Logistics',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!canCreateAdmin()) {
      return NextResponse.json(
        { error: 'A Fleet Owner (Admin) account already exists. Only one Admin is permitted by business policy.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { businessName, ownerName, email, phone, password, address, gstin } = body;

    if (!ownerName || !phone || !password) {
      return NextResponse.json(
        { error: 'Owner Name, Phone Number, and Password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const adminId = `usr_admin_${Date.now()}`;
    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : `owner_${Date.now()}@vahan360.local`;

    const newAdmin: User = {
      id: adminId,
      name: ownerName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: 'admin',
      status: 'active',
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newAdmin);

    // Update business settings with real owner info
    db.settings = {
      ...db.settings,
      businessName: businessName?.trim() || 'Vahan360 Fleet Logistics',
      ownerName: ownerName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address?.trim() || '',
      gstin: gstin?.trim() || '',
      updatedAt: now,
    };

    // Record audit event
    logAudit(
      newAdmin.id,
      `${newAdmin.name} (Owner)`,
      'admin',
      'OWNER_ACCOUNT_INITIALIZED',
      'User',
      `Fleet Owner registered and business initialized for "${db.settings.businessName}".`,
      newAdmin.id
    );

    saveDatabase(db);

    // Create session cookie to immediately log the owner in
    await createSession(newAdmin);

    return NextResponse.json({
      success: true,
      message: 'Fleet Owner account initialized successfully.',
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: newAdmin.role,
      },
    });
  } catch (err: any) {
    console.error('Setup admin error:', err);
    return NextResponse.json({ error: 'Failed to initialize owner account' }, { status: 500 });
  }
}
