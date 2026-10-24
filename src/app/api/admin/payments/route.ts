import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { TripPayment } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const customerId = searchParams.get('customerId');
    const db = getDatabase();

    let payments = db.tripPayments;
    if (tripId) payments = payments.filter((p) => p.tripId === tripId);
    if (customerId) payments = payments.filter((p) => p.customerId === customerId);

    const enrichedPayments = payments.map((p) => {
      const trip = db.trips.find((t) => t.id === p.tripId);
      const customer = db.customers.find((c) => c.id === p.customerId);
      return {
        ...p,
        tripNumber: trip?.tripNumber || 'Unknown',
        customerName: customer?.name || 'Unknown',
      };
    });

    return NextResponse.json({ payments: enrichedPayments });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { tripId, amount, paymentDate, paymentMethod, transactionRef, notes } = body;

    if (!tripId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid trip and positive payment amount are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Associated trip not found.' }, { status: 404 });
    }

    const payAmount = Number(amount);
    const existingPayments = db.tripPayments.filter((p) => p.tripId === tripId);
    const currentTotalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Prevent excessive payment that causes negative balance
    if (currentTotalPaid + payAmount > trip.freightAmount + 500) {
      // allow minimal rounding margin but prevent large erroneous overpayments
      return NextResponse.json(
        {
          error: `Payment ₹${payAmount} exceeds the remaining balance due of ₹${Math.max(0, trip.freightAmount - currentTotalPaid)}.`,
        },
        { status: 400 }
      );
    }

    const newPayment: TripPayment = {
      id: `pay_${Date.now()}`,
      tripId,
      customerId: trip.customerId,
      amount: payAmount,
      paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
      paymentMethod: paymentMethod || 'upi',
      transactionRef: transactionRef?.trim() || '',
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    db.tripPayments.push(newPayment);

    // Recalculate trip balance
    const updatedTotalPaid = currentTotalPaid + payAmount;
    trip.balanceDue = Math.max(0, trip.freightAmount - updatedTotalPaid);
    if (trip.balanceDue === 0) {
      trip.paymentStatus = 'paid';
    } else {
      trip.paymentStatus = 'partial';
    }
    trip.updatedAt = new Date().toISOString();

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'RECORD_PAYMENT',
      'TripPayment',
      `Recorded payment of ₹${payAmount} via ${paymentMethod} for trip ${trip.tripNumber}`,
      newPayment.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, payment: newPayment, trip });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
