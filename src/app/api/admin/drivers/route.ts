import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { calculateDriverSettlementSummary } from '@/lib/accounting';
import bcrypt from 'bcryptjs';
import { Driver, User } from '@/types';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDatabase();

    const driversWithDetails = db.drivers.map((d) => {
      const assignedVehicle = db.vehicles.find((v) => v.id === d.assignedVehicleId);
      const user = db.users.find((u) => u.id === d.userId);
      const trips = db.trips.filter((t) => t.driverId === d.id);
      const completedTrips = trips.filter((t) => t.tripStatus === 'completed');
      const expenses = db.expenses.filter((e) => e.driverId === d.id && e.approvalStatus === 'approved');
      const settlementSummary = calculateDriverSettlementSummary(d.id, db);

      // Calculate DL status
      const now = new Date();
      const expiry = new Date(d.dlExpiryDate);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
      let dlStatus: 'valid' | 'expiring_soon' | 'expired' = 'valid';
      if (diffDays <= 0) dlStatus = 'expired';
      else if (diffDays <= 30) dlStatus = 'expiring_soon';

      return {
        ...d,
        userStatus: user?.status || d.accountStatus,
        assignedVehicleReg: assignedVehicle ? `${assignedVehicle.regNumber} (${assignedVehicle.name})` : 'None',
        totalTrips: trips.length,
        completedTrips: completedTrips.length,
        totalExpensesReported: expenses.reduce((sum, e) => sum + e.amount, 0),
        dlDaysRemaining: diffDays,
        dlStatus,
        settlementSummary,
      };
    });

    return NextResponse.json({ drivers: driversWithDetails });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const db = getDatabase();

    const {
      fullName,
      phone,
      email,
      password,
      address,
      dlNumber,
      dlExpiryDate,
      emergencyContact,
      emergencyPhone,
      salaryType,
      agreedSalary,
      assignedVehicleId,
      notes,
    } = body;

    if (!fullName || !phone || !dlNumber || !dlExpiryDate) {
      return NextResponse.json({ error: 'Name, phone, DL number, and DL expiry are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanDl = dlNumber.trim().toUpperCase();

    if (db.users.some((u) => u.phone === cleanPhone)) {
      return NextResponse.json({ error: 'A user with this mobile number already exists.' }, { status: 400 });
    }
    if (db.drivers.some((d) => d.dlNumber.toUpperCase() === cleanDl)) {
      return NextResponse.json({ error: 'A driver with this DL number already exists.' }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password || 'Driver@123', salt);

    const userId = `usr_drv_${Date.now()}`;
    const driverId = `drv_${Date.now()}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      name: fullName.trim(),
      email: email ? email.trim().toLowerCase() : `driver_${Date.now()}@vahan360.local`,
      phone: cleanPhone,
      role: 'driver',
      status: 'active', // Admin-created drivers are directly active/approved
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const newDriver: Driver = {
      id: driverId,
      userId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: newUser.email,
      address: address?.trim() || '',
      dlNumber: cleanDl,
      dlExpiryDate,
      emergencyContact: emergencyContact?.trim() || '',
      emergencyPhone: emergencyPhone?.trim() || '',
      joiningDate: now.slice(0, 10),
      salaryType: salaryType || 'monthly',
      agreedSalary: Number(agreedSalary) || 16000,
      assignedVehicleId: assignedVehicleId || undefined,
      accountStatus: 'approved',
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    db.drivers.push(newDriver);

    if (assignedVehicleId) {
      const veh = db.vehicles.find((v) => v.id === assignedVehicleId);
      if (veh) veh.assignedDriverId = driverId;
    }

    logAudit(admin.id, admin.name, 'admin', 'CREATE_DRIVER', 'Driver', `Admin registered driver: ${newDriver.fullName}`, driverId);

    saveDatabase(db);
    return NextResponse.json({ success: true, driver: newDriver });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
