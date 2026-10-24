import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { MaintenanceRecord } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    const db = getDatabase();
    let records = db.maintenanceRecords;
    if (vehicleId) records = records.filter((m) => m.vehicleId === vehicleId);

    const enriched = records.map((m) => {
      const vehicle = db.vehicles.find((v) => v.id === m.vehicleId);
      return {
        ...m,
        vehicleReg: vehicle?.regNumber || 'Unknown',
        vehicleName: vehicle?.name || '',
      };
    });

    return NextResponse.json({ maintenanceRecords: enriched });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch maintenance records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      vehicleId,
      serviceDate,
      odometerReading,
      serviceType,
      workshopName,
      mechanicName,
      partsReplaced,
      partsCost,
      labourCost,
      nextServiceDate,
      nextServiceOdometer,
      invoiceUrl,
      invoiceName,
      notes,
    } = body;

    if (!vehicleId || !serviceType || !workshopName) {
      return NextResponse.json({ error: 'Vehicle, service type, and workshop name are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const vehicle = db.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    }

    const pCost = Number(partsCost) || 0;
    const lCost = Number(labourCost) || 0;
    const totalCost = pCost + lCost;
    const now = new Date().toISOString();

    const record: MaintenanceRecord = {
      id: `maint_${Date.now()}`,
      vehicleId,
      serviceDate: serviceDate || now.slice(0, 10),
      odometerReading: odometerReading ? Number(odometerReading) : vehicle.currentOdometer,
      serviceType,
      workshopName: workshopName.trim(),
      mechanicName: mechanicName?.trim() || undefined,
      partsReplaced: partsReplaced?.trim() || '',
      partsCost: pCost,
      labourCost: lCost,
      totalCost,
      nextServiceDate: nextServiceDate || undefined,
      nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
      invoiceUrl: invoiceUrl || undefined,
      invoiceName: invoiceName || undefined,
      notes: notes?.trim() || undefined,
      createdAt: now,
    };

    db.maintenanceRecords.unshift(record);

    // If odometer reading is higher than current, update vehicle odometer
    if (record.odometerReading > vehicle.currentOdometer) {
      vehicle.currentOdometer = record.odometerReading;
      vehicle.updatedAt = now;
    }

    // Automatically record an approved expense for this maintenance so financial statements stay in sync
    const maintExpense = {
      id: `exp_maint_${Date.now()}`,
      expenseDate: record.serviceDate,
      vehicleId: record.vehicleId,
      category: 'servicing' as const,
      amount: record.totalCost,
      paymentMethod: 'bank_transfer' as const,
      vendor: record.workshopName,
      description: `Workshop Service (${record.serviceType}): ${record.partsReplaced || 'Maintenance & Labour'}`,
      submittedBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      approvalDate: now,
      createdAt: now,
      updatedAt: now,
    };
    db.expenses.unshift(maintExpense);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'CREATE_MAINTENANCE',
      'Maintenance',
      `Recorded ${serviceType} for ${vehicle.regNumber} at ${workshopName} (Total: ₹${totalCost})`,
      record.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, maintenance: record });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to record maintenance' }, { status: 500 });
  }
}
