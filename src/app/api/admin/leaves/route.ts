import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { DriverLeaveRecord, Notification } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const month = searchParams.get('month'); // YYYY-MM
    const status = searchParams.get('status');

    const db = getDatabase();
    let leaves = db.driverLeaves || [];

    if (driverId) {
      leaves = leaves.filter((l) => l.driverId === driverId);
    }
    if (month) {
      leaves = leaves.filter((l) => l.deductedInSalaryMonth === month || l.date.startsWith(month));
    }
    if (status) {
      leaves = leaves.filter((l) => l.status === status);
    }

    // Enrich with driver information
    const enrichedLeaves = leaves
      .map((l) => {
        const driver = db.drivers.find((d) => d.id === l.driverId);
        const vehicle = driver?.assignedVehicleId
          ? db.vehicles.find((v) => v.id === driver.assignedVehicleId)
          : null;
        const dailyRate = driver?.agreedSalary ? Math.round(Number(driver.agreedSalary) / 30) : 0;

        return {
          ...l,
          driverName: driver ? driver.fullName : 'Unknown Driver',
          driverPhone: driver ? driver.phone : '',
          driverDlNumber: driver ? driver.dlNumber : '',
          assignedVehicleReg: vehicle ? `${vehicle.regNumber} (${vehicle.name})` : 'Unassigned',
          monthlySalary: driver ? driver.agreedSalary : 0,
          dailyRate,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Summary calculations
    const penaltyAppliedLeaves = leaves.filter((l) => l.status === 'penalty_applied');
    const totalDeductions = penaltyAppliedLeaves.reduce((sum, l) => sum + (Number(l.deductionAmount) || 0), 0);
    const totalBunksCount = leaves.filter((l) => l.leaveType === 'unexcused_bunk').length;

    return NextResponse.json({
      leaves: enrichedLeaves,
      summary: {
        totalRecords: leaves.length,
        totalBunkDays: totalBunksCount,
        totalDeductions,
        waivedCount: leaves.filter((l) => l.status === 'waived').length,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch driver leaves' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      driverId,
      date,
      leaveType = 'unexcused_bunk',
      reason = '',
      deductionAmount,
      deductedInSalaryMonth,
      status = 'penalty_applied',
      notes = '',
    } = body;

    if (!driverId || !date) {
      return NextResponse.json({ error: 'Driver and Date are required.' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.driverLeaves) db.driverLeaves = [];

    const driver = db.drivers.find((d) => d.id === driverId);
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found.' }, { status: 404 });
    }

    // Default daily salary rate: agreedSalary / 30
    const calculatedDailyRate = driver.agreedSalary ? Math.round(Number(driver.agreedSalary) / 30) : 0;
    const finalDeductionAmount =
      deductionAmount !== undefined && deductionAmount !== null && deductionAmount !== ''
        ? Number(deductionAmount)
        : calculatedDailyRate;

    const salaryMonth = deductedInSalaryMonth || date.slice(0, 7);
    const now = new Date().toISOString();

    const newRecord: DriverLeaveRecord = {
      id: `bunk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      driverId,
      date,
      leaveType,
      reason: reason.trim(),
      deductionAmount: finalDeductionAmount,
      deductedInSalaryMonth: salaryMonth,
      status,
      notes: notes.trim(),
      recordedBy: admin.name,
      createdAt: now,
      updatedAt: now,
    };

    db.driverLeaves.unshift(newRecord);

    // Audit log
    logAudit(
      admin.id,
      admin.name,
      'admin',
      'RECORD_DRIVER_BUNK',
      'DriverLeave',
      `Admin logged ${leaveType} for driver "${driver.fullName}" on ${date} with ₹${finalDeductionAmount} salary deduction (${salaryMonth}).`,
      newRecord.id
    );

    // Notification to driver
    if (driver.userId) {
      const notif: Notification = {
        id: `notif_${Date.now()}`,
        targetUserId: driver.userId,
        type: 'salary_payment',
        title: `Attendance / Leave Recorded: ${date}`,
        message:
          status === 'penalty_applied' && finalDeductionAmount > 0
            ? `Admin logged an absence on ${date}. A salary cut of ₹${finalDeductionAmount.toLocaleString('en-IN')} will apply in ${salaryMonth} payroll.`
            : `Admin recorded a leave on ${date}. Reason: ${reason || 'Approved leave'}.`,
        link: '/driver/salary',
        isRead: false,
        priority: status === 'penalty_applied' ? 'high' : 'normal',
        createdAt: now,
      };
      db.notifications.unshift(notif);
    }

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Driver bunk / leave record logged successfully.',
      leave: newRecord,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to record driver leave', details: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { id, date, leaveType, reason, deductionAmount, deductedInSalaryMonth, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Leave record ID is required.' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.driverLeaves) db.driverLeaves = [];

    const index = db.driverLeaves.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Leave record not found.' }, { status: 404 });
    }

    const current = db.driverLeaves[index];
    const updated: DriverLeaveRecord = {
      ...current,
      date: date || current.date,
      leaveType: leaveType || current.leaveType,
      reason: reason !== undefined ? reason.trim() : current.reason,
      deductionAmount: deductionAmount !== undefined ? Number(deductionAmount) : current.deductionAmount,
      deductedInSalaryMonth: deductedInSalaryMonth || current.deductedInSalaryMonth,
      status: status || current.status,
      notes: notes !== undefined ? notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    db.driverLeaves[index] = updated;

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'UPDATE_DRIVER_BUNK',
      'DriverLeave',
      `Admin updated leave/bunk record #${id} (Date: ${updated.date}, Deduction: ₹${updated.deductionAmount}, Status: ${updated.status}).`,
      id
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Driver leave record updated successfully.',
      leave: updated,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update leave record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Leave ID is required.' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.driverLeaves) db.driverLeaves = [];

    const index = db.driverLeaves.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    const removed = db.driverLeaves.splice(index, 1)[0];

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'DELETE_DRIVER_BUNK',
      'DriverLeave',
      `Admin deleted leave/bunk record #${id} for driver ${removed.driverId} on ${removed.date}.`,
      id
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Leave record deleted successfully.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete leave record' }, { status: 500 });
  }
}
