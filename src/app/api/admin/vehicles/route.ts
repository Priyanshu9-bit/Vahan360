import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Vehicle } from '@/types';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDatabase();

    const vehiclesWithDetails = db.vehicles.map((v) => {
      const assignedDriver = db.drivers.find((d) => d.id === v.assignedDriverId);
      const vehicleDocs = db.documents.filter((doc) => doc.vehicleId === v.id);
      const vehicleTrips = db.trips.filter((t) => t.vehicleId === v.id && t.tripStatus !== 'cancelled');
      const vehicleExpenses = db.expenses.filter((e) => e.vehicleId === v.id && e.approvalStatus === 'approved');

      const totalFreight = vehicleTrips.reduce((sum, t) => sum + t.freightAmount, 0);
      const totalExpenses = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = totalFreight - totalExpenses;

      return {
        ...v,
        driverName: assignedDriver?.fullName || 'Unassigned',
        driverPhone: assignedDriver?.phone || '',
        documentsCount: vehicleDocs.length,
        expiringDocsCount: vehicleDocs.filter((d) => d.status === 'expiring_soon' || d.status === 'expired').length,
        totalTrips: vehicleTrips.length,
        totalFreight,
        totalExpenses,
        profit,
      };
    });

    return NextResponse.json({ vehicles: vehiclesWithDetails });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const {
      regNumber,
      name,
      manufacturer,
      model,
      vehicleType,
      regDate,
      chassisNumber,
      engineNumber,
      fuelType,
      currentOdometer,
      purchaseDate,
      purchasePrice,
      loanDetails,
      assignedDriverId,
      notes,
    } = body;

    if (!regNumber || !name || currentOdometer === undefined || currentOdometer === null || currentOdometer === '') {
      return NextResponse.json(
        { error: 'Vehicle number, vehicle name, and current odometer reading are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const cleanReg = regNumber.trim().toUpperCase();

    const existing = db.vehicles.find((v) => v.regNumber.toUpperCase() === cleanReg);
    if (existing) {
      return NextResponse.json({ error: 'A vehicle with this registration number already exists.' }, { status: 400 });
    }

    const newVehicle: Vehicle = {
      id: `veh_${Date.now()}`,
      regNumber: cleanReg,
      name: name.trim(),
      manufacturer: manufacturer?.trim() || 'Commercial',
      model: model?.trim() || '',
      vehicleType: vehicleType?.trim() || 'Pickup Truck',
      regDate: regDate || new Date().toISOString().slice(0, 10),
      chassisNumber: chassisNumber?.trim() || '',
      engineNumber: engineNumber?.trim() || '',
      fuelType: fuelType || 'Diesel',
      currentOdometer: Number(currentOdometer) || 0,
      purchaseDate: purchaseDate || new Date().toISOString().slice(0, 10),
      purchasePrice: Number(purchasePrice) || 0,
      loanDetails: loanDetails?.financer
        ? {
            financer: loanDetails.financer,
            loanAccountNumber: loanDetails.loanAccountNumber || '',
            totalLoanAmount: Number(loanDetails.totalLoanAmount) || 0,
            emiAmount: Number(loanDetails.emiAmount) || 0,
            tenureMonths: Number(loanDetails.tenureMonths) || 0,
            startDate: loanDetails.startDate || new Date().toISOString().slice(0, 10),
          }
        : undefined,
      status: 'active',
      assignedDriverId: assignedDriverId || undefined,
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.vehicles.push(newVehicle);

    // If driver assigned, update driver record as well
    if (assignedDriverId) {
      const driver = db.drivers.find((d) => d.id === assignedDriverId);
      if (driver) {
        driver.assignedVehicleId = newVehicle.id;
        driver.updatedAt = new Date().toISOString();
      }
    }

    logAudit(admin.id, admin.name, 'admin', 'CREATE_VEHICLE', 'Vehicle', `Added vehicle: ${newVehicle.regNumber} (${newVehicle.name})`, newVehicle.id);

    saveDatabase(db);
    return NextResponse.json({ success: true, vehicle: newVehicle });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add vehicle' }, { status: 500 });
  }
}
