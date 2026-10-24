import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { calculateTripProfit } from '@/lib/accounting';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDatabase();

    const trip = db.trips.find((t) => t.id === id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
    const driver = db.drivers.find((d) => d.id === trip.driverId);
    const customer = db.customers.find((c) => c.id === trip.customerId);
    const payments = db.tripPayments.filter((p) => p.tripId === id);
    const directExpenses = db.expenses.filter((e) => e.tripId === id);
    const profit = calculateTripProfit(trip, db.expenses);

    return NextResponse.json({
      trip,
      vehicle,
      driver,
      customer,
      payments,
      expenses: directExpenses,
      profit,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch trip details' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = getDatabase();

    const tripIndex = db.trips.findIndex((t) => t.id === id);
    if (tripIndex === -1) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const currentTrip = db.trips[tripIndex];
    const prevStatus = currentTrip.tripStatus;

    // Update status and odometer
    let distanceKm = currentTrip.distanceKm;
    if (body.odometerEnd !== undefined && body.odometerEnd !== null && body.odometerEnd !== '') {
      const odoEnd = Number(body.odometerEnd);
      distanceKm = Math.max(0, odoEnd - currentTrip.odometerStart);
      
      // Automatically update vehicle's current odometer in vehicle details
      const veh = db.vehicles.find((v) => v.id === currentTrip.vehicleId || (v.regNumber && (currentTrip as any).vehicleReg === v.regNumber));
      if (veh) {
        veh.currentOdometer = odoEnd;
        veh.updatedAt = new Date().toISOString();
      }
    }

    const updatedTrip = {
      ...currentTrip,
      ...body,
      id: currentTrip.id, // protect ID
      distanceKm,
      updatedAt: new Date().toISOString(),
    };

    if (body.odometerEnd) {
      updatedTrip.odometerEnd = Number(body.odometerEnd);
    }

    if (body.vehicleId) {
      updatedTrip.vehicleId = body.vehicleId;
    }
    if (body.driverId) {
      updatedTrip.driverId = body.driverId;
    }
    if (body.odometerStart !== undefined && body.odometerStart !== null && body.odometerStart !== '') {
      updatedTrip.odometerStart = Number(body.odometerStart);
    }

    // If trip started / dispatched
    if (body.tripStatus === 'in_progress') {
      if (!updatedTrip.tripStartDate || prevStatus !== 'in_progress') {
        updatedTrip.tripStartDate = body.tripStartDate || new Date().toISOString();
      }
      // Notify assigned driver in their portal
      const assignedDriver = db.drivers.find((d) => d.id === updatedTrip.driverId);
      const assignedVeh = db.vehicles.find((v) => v.id === updatedTrip.vehicleId);
      if (assignedDriver && assignedDriver.userId) {
        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          targetUserId: assignedDriver.userId,
          type: 'trip_update',
          title: `Trip Dispatched: ${updatedTrip.tripNumber}`,
          message: `Trip ${updatedTrip.tripNumber} on vehicle ${assignedVeh?.regNumber || 'fleet vehicle'} is now IN PROGRESS. Route: ${updatedTrip.loadingLocation} -> ${updatedTrip.deliveryLocation}.`,
          link: '/driver/trips',
          isRead: false,
          priority: 'high',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // If trip completed
    if (body.tripStatus === 'completed') {
      if (!updatedTrip.actualCompletionDate) {
        updatedTrip.actualCompletionDate = body.actualCompletionDate || new Date().toISOString();
      }
    }

    // Recalculate balance due based on actual payments
    const payments = db.tripPayments.filter((p) => p.tripId === id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    updatedTrip.balanceDue = Math.max(0, updatedTrip.freightAmount - totalPaid);
    if (updatedTrip.balanceDue === 0 && totalPaid > 0) {
      updatedTrip.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      updatedTrip.paymentStatus = 'partial';
    } else {
      updatedTrip.paymentStatus = 'pending';
    }

    db.trips[tripIndex] = updatedTrip;

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'UPDATE_TRIP',
      'Trip',
      `Updated trip ${currentTrip.tripNumber} (Status: ${updatedTrip.tripStatus})`,
      id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, trip: updatedTrip });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}
