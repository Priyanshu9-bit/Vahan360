import { NextResponse } from 'next/server';
import { requireApprovedDriver } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Notification } from '@/types';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, driver } = await requireApprovedDriver();
    const { id } = await params;
    const body = await request.json();
    const { tripStatus, odometerEnd, notes } = body;

    if (!tripStatus || !['in_progress', 'completed'].includes(tripStatus)) {
      return NextResponse.json({ error: 'Drivers can only update status to In Progress or Completed.' }, { status: 400 });
    }

    const db = getDatabase();
    const tripIndex = db.trips.findIndex((t) => t.id === id);
    if (tripIndex === -1) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    const trip = db.trips[tripIndex];

    // SECURITY: Driver must be the one assigned to this trip
    if (trip.driverId !== driver.id) {
      return NextResponse.json({ error: 'Unauthorized: You are not assigned to this trip.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    trip.tripStatus = tripStatus;

    if (tripStatus === 'completed') {
      trip.actualCompletionDate = now;
      if (odometerEnd) {
        const odoEnd = Number(odometerEnd);
        if (odoEnd < trip.odometerStart) {
          return NextResponse.json(
            { error: `Closing odometer (${odoEnd}) cannot be less than starting odometer (${trip.odometerStart}).` },
            { status: 400 }
          );
        }
        trip.odometerEnd = odoEnd;
        trip.distanceKm = odoEnd - trip.odometerStart;

        // Update vehicle current odometer
        const veh = db.vehicles.find((v) => v.id === trip.vehicleId || (v.regNumber && (trip as any).vehicleReg === v.regNumber));
        if (veh) {
          veh.currentOdometer = odoEnd;
          veh.updatedAt = now;
        }
      }
    }

    if (notes) trip.notes = notes;
    trip.updatedAt = now;

    // Notify Admin
    const adminNotif: Notification = {
      id: `notif_${Date.now()}`,
      type: 'trip_update',
      title: `Trip ${tripStatus === 'completed' ? 'Completed' : 'Started'}: ${trip.tripNumber}`,
      message: `Driver ${driver.fullName} marked ${trip.tripNumber} as ${tripStatus.toUpperCase()}.${trip.distanceKm ? ` Total distance: ${trip.distanceKm} km.` : ''}`,
      link: '/admin/trips',
      isRead: false,
      priority: 'normal',
      createdAt: now,
    };
    db.notifications.unshift(adminNotif);

    logAudit(
      user.id,
      driver.fullName,
      'driver',
      'DRIVER_TRIP_STATUS_UPDATE',
      'Trip',
      `Driver updated trip ${trip.tripNumber} to ${tripStatus}`,
      trip.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, trip });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json(
        { error: 'Forbidden: Driver access only. Fleet Owners manage trips from the Owner Console.' },
        { status: 403 }
      );
    }
    if (err.message === 'APPROVAL_PENDING' || err.message === 'ACCESS_RESTRICTED') {
      return NextResponse.json({ error: 'Account inactive or pending approval' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update trip status' }, { status: 500 });
  }
}
