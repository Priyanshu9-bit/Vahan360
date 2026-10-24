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
