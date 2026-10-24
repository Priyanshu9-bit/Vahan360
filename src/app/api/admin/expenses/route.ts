import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Expense } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const vehicleId = searchParams.get('vehicleId');
    const approvalStatus = searchParams.get('status');

    const db = getDatabase();
    let expenses = db.expenses;

    if (category) expenses = expenses.filter((e) => e.category === category);
    if (vehicleId) expenses = expenses.filter((e) => e.vehicleId === vehicleId);
    if (approvalStatus) expenses = expenses.filter((e) => e.approvalStatus === approvalStatus);

    const enrichedExpenses = expenses.map((e) => {
      const vehicle = db.vehicles.find((v) => v.id === e.vehicleId);
      const driver = db.drivers.find((d) => d.id === e.driverId);
      const trip = db.trips.find((t) => t.id === e.tripId);
      const submitter = db.users.find((u) => u.id === e.submittedBy);
      return {
        ...e,
        vehicleReg: vehicle?.regNumber || 'General',
        vehicleName: vehicle?.name || '',
        driverName: driver?.fullName || (submitter?.role === 'admin' ? 'Owner / Admin' : 'Unassigned'),
        tripNumber: trip?.tripNumber || null,
        submitterName: submitter?.name || 'System',
      };
    });

    return NextResponse.json({ expenses: enrichedExpenses });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      expenseDate,
      vehicleId,
      driverId,
      tripId,
      category,
      amount,
      paymentMethod,
      vendor,
      description,
      receiptUrl,
      receiptName,
    } = body;

    if (!category || !amount || Number(amount) <= 0 || !description) {
      return NextResponse.json(
        { error: 'Category, positive amount, and description are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    let finalVehicleId = vehicleId;
    let finalDriverId = driverId;
    if (tripId) {
      const trip = db.trips.find((t) => t.id === tripId);
      if (trip) {
        if (!finalVehicleId) finalVehicleId = trip.vehicleId;
        if (!finalDriverId) finalDriverId = trip.driverId;
      }
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      expenseDate: expenseDate || now.slice(0, 10),
      vehicleId: finalVehicleId || undefined,
      driverId: finalDriverId || undefined,
      tripId: tripId || undefined,
      category,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      vendor: vendor?.trim() || undefined,
      description: description.trim(),
      receiptUrl: receiptUrl || undefined,
      receiptName: receiptName || undefined,
      submittedBy: admin.id,
      approvalStatus: 'approved', // Admin entered expenses are immediately approved
      approvedBy: admin.id,
      approvalDate: now,
      createdAt: now,
      updatedAt: now,
    };

    db.expenses.unshift(newExpense);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'RECORD_EXPENSE',
      'Expense',
      `Recorded approved expense of ₹${newExpense.amount} (${category}) - ${description}`,
      newExpense.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, expense: newExpense });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
  }
}
