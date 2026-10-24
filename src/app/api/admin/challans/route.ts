import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Challan } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');

    const db = getDatabase();
    let challans = db.challans;
    if (vehicleId) challans = challans.filter((c) => c.vehicleId === vehicleId);
    if (status) challans = challans.filter((c) => c.paymentStatus === status);

    const enriched = challans.map((c) => {
      const vehicle = db.vehicles.find((v) => v.id === c.vehicleId);
      return {
        ...c,
        vehicleReg: vehicle?.regNumber || 'Unknown',
        vehicleName: vehicle?.name || '',
      };
    });

    return NextResponse.json({
      challans: enriched,
      parivahanPortalUrl: 'https://echallan.parivahan.gov.in',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch challans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { vehicleId, challanNumber, challanDate, violationDescription, fineAmount, paymentDeadline, paymentStatus, notes } = body;

    if (!vehicleId || !challanNumber || !violationDescription || !fineAmount) {
      return NextResponse.json({ error: 'Vehicle, challan number, violation details, and fine amount are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const vehicle = db.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    }

    const cleanNum = challanNumber.trim().toUpperCase();
    if (db.challans.some((c) => c.challanNumber.toUpperCase() === cleanNum)) {
      return NextResponse.json({ error: 'This challan number has already been recorded.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newChallan: Challan = {
      id: `chal_${Date.now()}`,
      vehicleId,
      challanNumber: cleanNum,
      challanDate: challanDate || now.slice(0, 10),
      violationDescription: violationDescription.trim(),
      fineAmount: Number(fineAmount),
      paymentDeadline: paymentDeadline || undefined,
      paymentStatus: paymentStatus || 'unpaid',
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.challans.unshift(newChallan);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'RECORD_CHALLAN',
      'Challan',
      `Recorded challan ${cleanNum} (₹${newChallan.fineAmount}) for vehicle ${vehicle.regNumber}`,
      newChallan.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, challan: newChallan });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to record challan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { id, paymentStatus, paymentDate, notes } = body;

    if (!id || !paymentStatus) {
      return NextResponse.json({ error: 'Challan ID and new payment status are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const challan = db.challans.find((c) => c.id === id);
    if (!challan) {
      return NextResponse.json({ error: 'Challan not found.' }, { status: 404 });
    }

    challan.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid') {
      challan.paymentDate = paymentDate || new Date().toISOString().slice(0, 10);
    }
    if (notes) challan.notes = notes;
    challan.updatedAt = new Date().toISOString();

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'CHALLAN_STATUS_UPDATE',
      'Challan',
      `Updated challan ${challan.challanNumber} status to ${paymentStatus}`,
      id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, challan });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update challan' }, { status: 500 });
  }
}
