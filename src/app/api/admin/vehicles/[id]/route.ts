import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDatabase();

    const vehicle = db.vehicles.find((v) => v.id === id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const assignedDriver = db.drivers.find((d) => d.id === vehicle.assignedDriverId);
    const documents = db.documents.filter((d) => d.vehicleId === id);
    const trips = db.trips
      .filter((t) => t.vehicleId === id)
      .map((t) => {
        const cust = db.customers.find((c) => c.id === t.customerId);
        const drv = db.drivers.find((d) => d.id === t.driverId);
        return {
          ...t,
          customerName: cust?.name || 'Unknown',
          driverName: drv?.fullName || 'Unknown',
        };
      });

    const expenses = db.expenses.filter((e) => e.vehicleId === id);
    const maintenance = db.maintenanceRecords.filter((m) => m.vehicleId === id);
    const challans = db.challans.filter((c) => c.vehicleId === id);

    // Financial totals for this vehicle
    const validTrips = trips.filter((t) => t.tripStatus !== 'cancelled');
    const totalFreight = validTrips.reduce((sum, t) => sum + t.freightAmount, 0);
    const approvedExpenses = expenses.filter((e) => e.approvalStatus === 'approved');
    const totalExpenses = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalFuelCost = approvedExpenses.filter((e) => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0);
    const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.totalCost, 0);
    const netProfit = totalFreight - totalExpenses;

    return NextResponse.json({
      vehicle,
      assignedDriver,
      documents,
      trips,
      expenses,
      maintenance,
      challans,
      financials: {
        totalFreight,
        totalExpenses,
        totalFuelCost,
        totalMaintenanceCost,
        netProfit,
        profitMargin: totalFreight > 0 ? Math.round((netProfit / totalFreight) * 1000) / 10 : 0,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch vehicle profile' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = getDatabase();

    const vehicleIndex = db.vehicles.findIndex((v) => v.id === id);
    if (vehicleIndex === -1) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const currentVehicle = db.vehicles[vehicleIndex];
    const previousDriverId = currentVehicle.assignedDriverId;

    // Update fields
    db.vehicles[vehicleIndex] = {
      ...currentVehicle,
      ...body,
      id: currentVehicle.id, // protect ID
      regNumber: body.regNumber ? body.regNumber.trim().toUpperCase() : currentVehicle.regNumber,
      currentOdometer: body.currentOdometer !== undefined ? Number(body.currentOdometer) : currentVehicle.currentOdometer,
      updatedAt: new Date().toISOString(),
    };

    // If driver assignment changed
    if (body.assignedDriverId !== undefined && body.assignedDriverId !== previousDriverId) {
      if (previousDriverId) {
        const oldDriver = db.drivers.find((d) => d.id === previousDriverId);
        if (oldDriver && oldDriver.assignedVehicleId === id) {
          oldDriver.assignedVehicleId = undefined;
        }
      }
      if (body.assignedDriverId) {
        const newDriver = db.drivers.find((d) => d.id === body.assignedDriverId);
        if (newDriver) {
          newDriver.assignedVehicleId = id;
        }
      }
    }

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'UPDATE_VEHICLE',
      'Vehicle',
      `Updated details for vehicle ${db.vehicles[vehicleIndex].regNumber}`,
      id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, vehicle: db.vehicles[vehicleIndex] });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = getDatabase();

    const vehicleIndex = db.vehicles.findIndex((v) => v.id === id);
    if (vehicleIndex === -1) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = db.vehicles[vehicleIndex];

    // Check Master Security PIN if configured
    const pinHeader = request.headers.get('x-security-pin');
    if (admin.securityPinHash) {
      if (!pinHeader) {
        return NextResponse.json({ error: 'Master Security PIN required to delete this vehicle.', requirePin: true }, { status: 403 });
      }
      const bcrypt = (await import('bcryptjs')).default;
      const isPinMatch = bcrypt.compareSync(pinHeader.trim(), admin.securityPinHash);
      const isPasswordMatch = bcrypt.compareSync(pinHeader.trim(), admin.passwordHash);
      if (!isPinMatch && !isPasswordMatch) {
        return NextResponse.json({ error: 'Invalid Master Security PIN.', requirePin: true }, { status: 403 });
      }
    }

    // Check if vehicle has an active in_progress trip
    const activeTrip = db.trips.find(
      (t) => (t.vehicleId === id || (t as any).vehicleReg === vehicle.regNumber) && t.tripStatus === 'in_progress'
    );
    if (activeTrip) {
      return NextResponse.json(
        {
          error: `Cannot delete vehicle ${vehicle.regNumber} while it is in transit on active Trip #${activeTrip.tripNumber}. Please complete or re-assign the trip first.`,
        },
        { status: 400 }
      );
    }

    // Unassign this vehicle from any assigned drivers
    db.drivers.forEach((drv) => {
      if (drv.assignedVehicleId === id) {
        drv.assignedVehicleId = undefined;
        drv.updatedAt = new Date().toISOString();
      }
    });

    // If there are planned or assigned trips on this vehicle, unassign the vehicle or mark notes
    db.trips.forEach((trip) => {
      if (trip.vehicleId === id && trip.tripStatus !== 'completed' && trip.tripStatus !== 'cancelled') {
        trip.vehicleId = '';
        trip.tripStatus = 'planned';
        trip.notes = trip.notes
          ? `${trip.notes}\n[Vehicle ${vehicle.regNumber} deleted - Reassign vehicle]`
          : `[Vehicle ${vehicle.regNumber} deleted - Reassign vehicle]`;
      }
    });

    // Remove vehicle documents
    db.documents = db.documents.filter((d) => d.vehicleId !== id);

    // Remove vehicle from db
    db.vehicles.splice(vehicleIndex, 1);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'DELETE_VEHICLE',
      'Vehicle',
      `Permanently deleted vehicle ${vehicle.regNumber} (${vehicle.name}) from fleet`,
      id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, message: `Vehicle ${vehicle.regNumber} deleted successfully.` });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}

