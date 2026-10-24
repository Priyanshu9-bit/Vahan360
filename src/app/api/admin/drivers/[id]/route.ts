import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { calculateDriverSettlementSummary, formatINR } from '@/lib/accounting';
import { Notification } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDatabase();

    const driver = db.drivers.find((d) => d.id === id);
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const user = db.users.find((u) => u.id === driver.userId);
    const assignedVehicle = db.vehicles.find((v) => v.id === driver.assignedVehicleId);
    const trips = db.trips.filter((t) => t.driverId === id);
    const expenses = db.expenses.filter((e) => e.driverId === id);
    const salaryRecords = db.salaryRecords.filter((s) => s.driverId === id);
    const salaryPayments = db.salaryPayments.filter((p) => p.driverId === id);
    const settlementSummary = calculateDriverSettlementSummary(id, db);

    return NextResponse.json({
      driver,
      user: user ? { id: user.id, status: user.status, email: user.email, phone: user.phone } : null,
      assignedVehicle,
      trips,
      expenses,
      salaryRecords,
      salaryPayments,
      settlementSummary,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch driver' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = getDatabase();

    const driverIndex = db.drivers.findIndex((d) => d.id === id);
    if (driverIndex === -1) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = db.drivers[driverIndex];
    const userIndex = db.users.findIndex((u) => u.id === driver.userId);

    // Handle Approval / Rejection / Suspension
    if (body.accountStatus && body.accountStatus !== driver.accountStatus) {
      const newStatus = body.accountStatus;
      driver.accountStatus = newStatus;

      if (userIndex !== -1) {
        if (newStatus === 'approved') {
          db.users[userIndex].status = 'active';
          // Add notification for driver
          const notif: Notification = {
            id: `notif_${Date.now()}`,
            targetUserId: driver.userId,
            type: 'driver_approval',
            title: 'Account Approved by Owner!',
            message: 'Your Vahan360 driver account has been approved. You can now access your dashboard and trip assignments.',
            link: '/driver/dashboard',
            isRead: false,
            priority: 'high',
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notif);
        } else if (newStatus === 'suspended') {
          db.users[userIndex].status = 'suspended';
        } else if (newStatus === 'rejected') {
          db.users[userIndex].status = 'rejected';
        }
        db.users[userIndex].updatedAt = new Date().toISOString();
      }

      logAudit(
        admin.id,
        admin.name,
        'admin',
        'DRIVER_STATUS_CHANGE',
        'Driver',
        `Changed driver status for ${driver.fullName} to ${newStatus}`,
        id
      );
    }

    // Vehicle Assignment updates
    if (body.assignedVehicleId !== undefined && body.assignedVehicleId !== driver.assignedVehicleId) {
      // Unassign from old vehicle
      if (driver.assignedVehicleId) {
        const oldVeh = db.vehicles.find((v) => v.id === driver.assignedVehicleId);
        if (oldVeh && oldVeh.assignedDriverId === id) {
          oldVeh.assignedDriverId = undefined;
        }
      }
      // Assign new vehicle
      if (body.assignedVehicleId) {
        const newVeh = db.vehicles.find((v) => v.id === body.assignedVehicleId);
        if (newVeh) {
          newVeh.assignedDriverId = id;
        }
      }
      driver.assignedVehicleId = body.assignedVehicleId || undefined;
    }

    // General updates
    if (body.fullName) driver.fullName = body.fullName.trim();
    if (body.phone) driver.phone = body.phone.trim();
    if (body.address !== undefined) driver.address = body.address.trim();
    if (body.dlNumber) driver.dlNumber = body.dlNumber.trim().toUpperCase();
    if (body.dlExpiryDate) driver.dlExpiryDate = body.dlExpiryDate;
    if (body.emergencyContact !== undefined) driver.emergencyContact = body.emergencyContact.trim();
    if (body.emergencyPhone !== undefined) driver.emergencyPhone = body.emergencyPhone.trim();
    if (body.salaryType) driver.salaryType = body.salaryType;
    if (body.agreedSalary !== undefined) driver.agreedSalary = Number(body.agreedSalary);
    if (body.notes !== undefined) driver.notes = body.notes.trim();

    driver.updatedAt = new Date().toISOString();

    saveDatabase(db);
    return NextResponse.json({ success: true, driver });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = getDatabase();

    const driverIndex = db.drivers.findIndex((d) => d.id === id);
    if (driverIndex === -1) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = db.drivers[driverIndex];
    const settlementSummary = calculateDriverSettlementSummary(id, db);

    // 1. Unassign any vehicles allocated to this driver
    db.vehicles.forEach((veh) => {
      if (veh.assignedDriverId === id) {
        veh.assignedDriverId = undefined;
      }
    });

    // 2. Re-pool active/assigned trips back to 'planned'
    db.trips.forEach((trip) => {
      if (trip.driverId === id && (trip.tripStatus === 'assigned' || trip.tripStatus === 'in_progress')) {
        trip.tripStatus = 'planned';
        trip.driverId = '';
        trip.notes = trip.notes
          ? `${trip.notes}\n[Auto-repooled: Driver ${driver.fullName} removed]`
          : `[Auto-repooled: Driver ${driver.fullName} removed]`;
      }
    });

    // 3. Remove driver profile
    db.drivers.splice(driverIndex, 1);

    // 4. Suspend or remove associated user account
    if (driver.userId) {
      const uIndex = db.users.findIndex((u) => u.id === driver.userId);
      if (uIndex !== -1) {
        db.users[uIndex].status = 'suspended';
        db.users[uIndex].updatedAt = new Date().toISOString();
      }
    }

    // 5. Log audit trail
    logAudit(
      admin.id,
      admin.name,
      'admin',
      'REMOVE_DRIVER',
      'Driver',
      `Permanently removed driver ${driver.fullName} (${driver.phone}). Recorded Net Settlement Amount: ${formatINR(settlementSummary.netPendingAmount)}. Unpaid Salary: ${formatINR(settlementSummary.unpaidSalaryDue)}, Expense Claims: ${formatINR(settlementSummary.approvedUnpaidExpenses)}`,
      id
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Driver ${driver.fullName} has been removed.`,
      settlementSummary,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to remove driver' }, { status: 500 });
  }
}
