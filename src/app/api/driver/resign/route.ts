import { NextResponse } from 'next/server';
import { requireApprovedDriver } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { calculateDriverSettlementSummary, formatINR } from '@/lib/accounting';
import { Notification } from '@/types';

export async function GET() {
  try {
    const { driver } = await requireApprovedDriver();
    const db = getDatabase();
    const summary = calculateDriverSettlementSummary(driver.id, db);
    return NextResponse.json({ settlementSummary: summary });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json({ error: 'Driver access only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch settlement' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, driver } = await requireApprovedDriver();
    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    const db = getDatabase();

    const summary = calculateDriverSettlementSummary(driver.id, db);

    // Update driver account status to resigned
    const driverInDb = db.drivers.find((d) => d.id === driver.id);
    if (!driverInDb) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    driverInDb.accountStatus = 'resigned';
    const noteEntry = `[Resigned on ${new Date().toISOString().slice(0, 10)}: ${reason ? reason.trim() : 'Job quit / voluntary resignation'}. Net Settlement Due: ${formatINR(summary.netPendingAmount)}]`;
    driverInDb.notes = driverInDb.notes ? `${driverInDb.notes}\n${noteEntry}` : noteEntry;
    driverInDb.updatedAt = new Date().toISOString();

    // Unassign vehicle so it is available for other drivers
    if (driverInDb.assignedVehicleId) {
      const v = db.vehicles.find((veh) => veh.id === driverInDb.assignedVehicleId);
      if (v && v.assignedDriverId === driverInDb.id) {
        v.assignedDriverId = undefined;
      }
      driverInDb.assignedVehicleId = undefined;
    }

    // High priority notification to Fleet Owner
    const adminUser = db.users.find((u) => u.role === 'admin' && u.status === 'active');
    if (adminUser) {
      const notif: Notification = {
        id: `notif_${Date.now()}`,
        targetUserId: adminUser.id,
        type: 'driver_resignation',
        title: `Job Quit / Resignation: ${driverInDb.fullName}`,
        message: `Driver ${driverInDb.fullName} (${driverInDb.phone}) has quit the job. Net pending settlement: ${formatINR(summary.netPendingAmount)}. Reason: ${reason ? reason.trim() : 'Quit Job'}. Please review settlement in Drivers panel.`,
        link: '/admin/drivers',
        isRead: false,
        priority: 'high',
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);
    }

    logAudit(
      user.id,
      driverInDb.fullName,
      'driver',
      'DRIVER_QUIT_JOB',
      'Driver',
      `Driver ${driverInDb.fullName} quit the job. Net pending settlement: ${formatINR(summary.netPendingAmount)}. Reason: ${reason || 'Not specified'}`,
      driverInDb.id
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Job resignation submitted successfully. The fleet owner has been notified for final settlement.',
      settlementSummary: summary,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json({ error: 'Driver access only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to process job resignation' }, { status: 500 });
  }
}
