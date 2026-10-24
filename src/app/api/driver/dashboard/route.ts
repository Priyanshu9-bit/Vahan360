import { NextResponse } from 'next/server';
import { requireApprovedDriver } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { computeDocumentStatus, calculateDriverSettlementSummary } from '@/lib/accounting';

export async function GET() {
  try {
    const { user, driver } = await requireApprovedDriver();
    const db = getDatabase();

    // 1. Assigned Vehicle (strip purchase price, loan info, profit numbers)
    const rawVehicle = db.vehicles.find((v) => v.id === driver.assignedVehicleId);
    let assignedVehicle = null;
    let vehicleDocs: any[] = [];
    if (rawVehicle) {
      assignedVehicle = {
        id: rawVehicle.id,
        regNumber: rawVehicle.regNumber,
        name: rawVehicle.name,
        manufacturer: rawVehicle.manufacturer,
        model: rawVehicle.model,
        fuelType: rawVehicle.fuelType,
        currentOdometer: rawVehicle.currentOdometer,
        status: rawVehicle.status,
      };

      // Driver can see vehicle documents relevant to road compliance (PUC, Insurance, RC, Fitness)
      vehicleDocs = db.documents
        .filter((d) => d.vehicleId === rawVehicle.id)
        .map((d) => {
          const { status, daysRemaining } = computeDocumentStatus(d.expiryDate);
          return {
            id: d.id,
            docType: d.docType,
            docNumber: d.docNumber,
            expiryDate: d.expiryDate,
            status,
            daysRemaining,
          };
        });
    }

    // 2. Trips assigned only to this driver
    const driverTrips = db.trips
      .filter((t) => t.driverId === driver.id)
      .map((t) => {
        const cust = db.customers.find((c) => c.id === t.customerId);
        return {
          id: t.id,
          tripNumber: t.tripNumber,
          bookingDate: t.bookingDate,
          customerName: cust?.name || 'Customer',
          customerPhone: t.customerContactPhone,
          loadingLocation: t.loadingLocation,
          deliveryLocation: t.deliveryLocation,
          goodsDescription: t.goodsDescription,
          weightKg: t.weightKg,
          tripStartDate: t.tripStartDate,
          expectedDeliveryDate: t.expectedDeliveryDate,
          odometerStart: t.odometerStart,
          odometerEnd: t.odometerEnd,
          distanceKm: t.distanceKm,
          tripStatus: t.tripStatus,
          notes: t.notes,
        };
      });

    // 3. Driver's own submitted expenses
    const myExpenses = db.expenses
      .filter((e) => e.driverId === driver.id || e.submittedBy === user.id)
      .map((e) => ({
        id: e.id,
        expenseDate: e.expenseDate,
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        vendor: e.vendor,
        description: e.description,
        approvalStatus: e.approvalStatus,
        approvalNotes: e.approvalNotes,
        receiptUrl: e.receiptUrl,
      }));

    // 4. Driver's salary and advances
    const salaryRecords = db.salaryRecords
      .filter((s) => s.driverId === driver.id)
      .map((s) => ({
        id: s.id,
        periodMonth: s.periodMonth,
        baseSalary: s.baseSalary,
        tripAllowance: s.tripAllowance,
        advancesDeducted: s.advancesDeducted,
        netPayable: s.netPayable,
        paidAmount: s.paidAmount,
        balanceDue: s.balanceDue,
        status: s.status,
      }));

    const paymentsReceived = db.salaryPayments
      .filter((p) => p.driverId === driver.id)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentType: p.paymentType,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNo: p.referenceNo,
        notes: p.notes,
      }));

    // 5. DL Expiry compliance
    const { status: dlStatus, daysRemaining: dlDaysRemaining } = computeDocumentStatus(driver.dlExpiryDate);

    // 6. Driver notifications
    const notifications = db.notifications
      .filter((n) => n.targetUserId === user.id)
      .slice(0, 20);

    const settlementSummary = calculateDriverSettlementSummary(driver.id, db);

    return NextResponse.json({
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        address: driver.address,
        dlNumber: driver.dlNumber,
        dlExpiryDate: driver.dlExpiryDate,
        dlStatus,
        dlDaysRemaining,
        joiningDate: driver.joiningDate,
        salaryType: driver.salaryType,
        agreedSalary: driver.agreedSalary,
        accountStatus: driver.accountStatus,
      },
      assignedVehicle,
      vehicleDocs,
      trips: driverTrips,
      expenses: myExpenses,
      salary: {
        records: salaryRecords,
        payments: paymentsReceived,
      },
      settlementSummary,
      notifications,
    });
  } catch (err: any) {
    if (err.message === 'APPROVAL_PENDING') {
      return NextResponse.json({ status: 'pending_approval' }, { status: 403 });
    }
    if (err.message === 'ACCESS_RESTRICTED') {
      return NextResponse.json({ status: 'suspended' }, { status: 403 });
    }
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_DRIVER_ONLY') {
      return NextResponse.json({ error: 'Driver access only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to load driver dashboard' }, { status: 500 });
  }
}
