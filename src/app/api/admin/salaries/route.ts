import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { DriverSalaryRecord, SalaryPayment, Notification } from '@/types';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const period = searchParams.get('period');

    const db = getDatabase();
    let records = db.salaryRecords;
    if (driverId) records = records.filter((r) => r.driverId === driverId);
    if (period) records = records.filter((r) => r.periodMonth === period);

    const enrichedRecords = records.map((r) => {
      const driver = db.drivers.find((d) => d.id === r.driverId);
      const vehicle = driver?.assignedVehicleId ? db.vehicles.find((v) => v.id === driver.assignedVehicleId) : null;
      const payments = db.salaryPayments.filter((p) => p.salaryRecordId === r.id);
      const driverLeaves = (db.driverLeaves || []).filter(
        (l) => l.driverId === r.driverId && (l.deductedInSalaryMonth === r.periodMonth || l.date.startsWith(r.periodMonth))
      );
      return {
        ...r,
        driverName: driver?.fullName || 'Unknown',
        driverPhone: driver?.phone || '',
        driverDlNumber: driver?.dlNumber || '',
        vehicleReg: vehicle?.regNumber || 'General Fleet',
        payments,
        driverLeaves,
      };
    });

    const allPayments = db.salaryPayments.map((p) => {
      const driver = db.drivers.find((d) => d.id === p.driverId);
      return {
        ...p,
        driverName: driver?.fullName || 'Unknown',
      };
    });

    return NextResponse.json({
      salaryRecords: enrichedRecords,
      recentPayments: allPayments.slice(0, 50),
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch salary records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { action } = body;
    const db = getDatabase();
    const now = new Date().toISOString();

    if (action === 'generate_month') {
      // Generate monthly salary statements for all approved drivers for a given month (YYYY-MM)
      const { periodMonth } = body;
      if (!periodMonth) {
        return NextResponse.json({ error: 'Please specify the salary period (YYYY-MM).' }, { status: 400 });
      }

      const approvedDrivers = db.drivers.filter((d) => d.accountStatus === 'approved');
      const createdRecords: DriverSalaryRecord[] = [];

      for (const driver of approvedDrivers) {
        const existing = db.salaryRecords.find(
          (s) => s.driverId === driver.id && s.periodMonth === periodMonth
        );
        if (existing) continue;

        // Calculate trip allowances for this month
        const monthlyTrips = db.trips.filter(
          (t) =>
            t.driverId === driver.id &&
            t.tripStatus === 'completed' &&
            t.tripStartDate.startsWith(periodMonth)
        );
        const tripAllowance = monthlyTrips.length * 200; // e.g. ₹200 bonus/allowance per completed trip

        // Calculate advances issued in this month
        const advancesInMonth = db.salaryPayments
          .filter(
            (p) =>
              p.driverId === driver.id &&
              p.paymentType === 'advance' &&
              p.paymentDate.startsWith(periodMonth)
          )
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Calculate bunks and leaves deductions in this month
        const bunksInMonth = (db.driverLeaves || []).filter(
          (l) =>
            l.driverId === driver.id &&
            (l.deductedInSalaryMonth === periodMonth || l.date.startsWith(periodMonth)) &&
            l.status === 'penalty_applied'
        );
        const bunkDays = bunksInMonth.length;
        const bunkDeductions = bunksInMonth.reduce((sum, l) => sum + (Number(l.deductionAmount) || 0), 0);

        const baseSalary = Number(driver.agreedSalary) || 0;
        const otherDeductions = bunkDeductions;
        const netPayable = Math.max(0, baseSalary + tripAllowance - advancesInMonth - otherDeductions);

        const newRecord: DriverSalaryRecord = {
          id: `sal_rec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          driverId: driver.id,
          periodMonth,
          salaryType: driver.salaryType,
          baseSalary,
          tripAllowance,
          advancesDeducted: advancesInMonth,
          bunkDays,
          bunkDeductions,
          otherDeductions,
          bonus: 0,
          netPayable,
          paidAmount: 0,
          balanceDue: netPayable,
          status: 'pending',
          notes: `Automated salary statement for ${periodMonth}${bunkDays > 0 ? ` (Includes ${bunkDays} bunks: -₹${bunkDeductions})` : ''}`,
          createdAt: now,
          updatedAt: now,
        };

        db.salaryRecords.push(newRecord);
        createdRecords.push(newRecord);
      }

      logAudit(
        admin.id,
        admin.name,
        'admin',
        'GENERATE_SALARY_MONTH',
        'Salary',
        `Generated ${createdRecords.length} salary records for period ${periodMonth}`
      );

      saveDatabase(db);
      return NextResponse.json({ success: true, createdCount: createdRecords.length, records: createdRecords });
    }

    if (action === 'record_payment') {
      const { salaryRecordId, driverId, amount, paymentType, paymentDate, paymentMethod, referenceNo, notes } = body;

      if (!driverId || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'Driver and positive amount are required.' }, { status: 400 });
      }

      const driver = db.drivers.find((d) => d.id === driverId);
      if (!driver) {
        return NextResponse.json({ error: 'Driver not found.' }, { status: 404 });
      }

      const payment: SalaryPayment = {
        id: `sal_pay_${Date.now()}`,
        salaryRecordId: salaryRecordId || undefined,
        driverId,
        amount: Number(amount),
        paymentType: paymentType || 'salary',
        paymentDate: paymentDate || now.slice(0, 10),
        paymentMethod: paymentMethod || 'bank_transfer',
        referenceNo: referenceNo?.trim() || undefined,
        notes: notes?.trim() || undefined,
        createdAt: now,
      };

      db.salaryPayments.push(payment);

      // If linked to a salary record, update paid amount & balance
      if (salaryRecordId) {
        const record = db.salaryRecords.find((r) => r.id === salaryRecordId);
        if (record) {
          record.paidAmount += payment.amount;
          record.balanceDue = Math.max(0, record.netPayable - record.paidAmount);
          if (record.balanceDue === 0) {
            record.status = 'paid';
          } else {
            record.status = 'partially_paid';
          }
          record.updatedAt = now;
        }
      }

      // Notify driver
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        targetUserId: driver.userId,
        type: 'salary_payment',
        title: `${paymentType === 'advance' ? 'Advance Payment Issued' : 'Salary Disbursed'}`,
        message: `₹${payment.amount} has been disbursed to your account via ${paymentMethod}.`,
        link: '/driver/salary',
        isRead: false,
        priority: 'high',
        createdAt: now,
      });

      logAudit(
        admin.id,
        admin.name,
        'admin',
        'SALARY_PAYMENT',
        'SalaryPayment',
        `Disbursed ₹${payment.amount} (${paymentType}) to driver ${driver.fullName}`,
        payment.id
      );

      saveDatabase(db);
      return NextResponse.json({ success: true, payment });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to process salary operation' }, { status: 500 });
  }
}
