import { NextResponse } from 'next/server';
import { requireApprovedDriver } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Expense, Notification } from '@/types';

export async function GET() {
  try {
    const { user, driver } = await requireApprovedDriver();
    const db = getDatabase();

    const myExpenses = db.expenses
      .filter((e) => e.driverId === driver.id || e.submittedBy === user.id)
      .map((e) => {
        const trip = db.trips.find((t) => t.id === e.tripId);
        return {
          ...e,
          tripNumber: trip?.tripNumber || null,
        };
      });

    return NextResponse.json({ expenses: myExpenses });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json(
        { error: 'Forbidden: Driver access only. Fleet Owners manage expenses in the Owner Console.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, driver } = await requireApprovedDriver();
    const body = await request.json();
    const { tripId, category, amount, paymentMethod, vendor, description, receiptUrl } = body;

    if (!category || !amount || Number(amount) <= 0 || !description) {
      return NextResponse.json({ error: 'Category, positive amount, and description are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    let finalTripId = tripId;
    let vehicleId = driver.assignedVehicleId;
    if (tripId) {
      const trip = db.trips.find((t) => t.id === tripId);
      if (trip) vehicleId = trip.vehicleId;
    } else {
      // Auto-attribute to driver's active or in-progress trip
      const activeTrip = db.trips.find(
        (t) => t.driverId === driver.id && (t.tripStatus === 'in_progress' || t.tripStatus === 'assigned')
      );
      if (activeTrip) {
        finalTripId = activeTrip.id;
        vehicleId = activeTrip.vehicleId;
      }
    }

    // STRICT: Driver submitted expenses are ALWAYS 'pending'
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      expenseDate: now.slice(0, 10),
      vehicleId,
      driverId: driver.id,
      tripId: finalTripId || undefined,
      category,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      vendor: vendor?.trim() || undefined,
      description: description.trim(),
      receiptUrl: receiptUrl || undefined,
      submittedBy: user.id,
      approvalStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    db.expenses.unshift(newExpense);

    // Notify Admin
    const adminNotif: Notification = {
      id: `notif_${Date.now()}`,
      type: 'expense_approval',
      title: 'New Expense Claim Submitted',
      message: `Driver ${driver.fullName} submitted ₹${newExpense.amount} (${category.replace(/_/g, ' ')}) for approval.`,
      link: '/admin/expenses',
      isRead: false,
      priority: 'normal',
      createdAt: now,
    };
    db.notifications.unshift(adminNotif);

    logAudit(
      user.id,
      driver.fullName,
      'driver',
      'SUBMIT_EXPENSE_CLAIM',
      'Expense',
      `Driver submitted expense claim for ₹${newExpense.amount} (${category})`,
      newExpense.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, expense: newExpense });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json(
        { error: 'Forbidden: Driver access only. Fleet Owners manage expenses in the Owner Console.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to submit expense claim' }, { status: 500 });
  }
}
