import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Trip, TripPayment } from '@/types';
import { calculateTripProfit } from '@/lib/accounting';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDatabase();

    const tripsWithDetails = db.trips.map((t) => {
      const vehicle = db.vehicles.find((v) => v.id === t.vehicleId);
      const driver = db.drivers.find((d) => d.id === t.driverId);
      const customer = db.customers.find((c) => c.id === t.customerId);
      const payments = db.tripPayments.filter((p) => p.tripId === t.id);
      const profitDetails = calculateTripProfit(t, db.expenses);

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, t.freightAmount - totalPaid);

      return {
        ...t,
        vehicleReg: vehicle?.regNumber || 'Unknown',
        vehicleName: vehicle?.name || '',
        driverName: driver?.fullName || 'Unknown',
        driverPhone: driver?.phone || '',
        customerName: t.customerName || customer?.name || 'Customer',
        paymentsCount: payments.length,
        totalPaid,
        balanceDue,
        profit: profitDetails,
      };
    });

    return NextResponse.json({ trips: tripsWithDetails });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const db = getDatabase();

    const {
      vehicleId,
      driverId,
      customerId,
      customerName,
      customerContactPhone,
      loadingLocation,
      deliveryLocation,
      goodsDescription,
      weightKg,
      tripStartDate,
      expectedDeliveryDate,
      odometerStart,
      freightAmount,
      advanceReceived,
      advancePaymentMethod,
      advanceTxnRef,
      notes,
    } = body;

    const typedCustomerName = (customerName || '').trim();

    if (!vehicleId || !driverId || (!typedCustomerName && !customerId) || !loadingLocation || !deliveryLocation || !freightAmount) {
      return NextResponse.json(
        { error: 'Vehicle, driver, customer name, pickup/delivery locations, and agreed freight amount are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Resolve or automatically create customer record seamlessly
    let finalCustomerId = customerId;
    let finalCustomerName = typedCustomerName;

    if (typedCustomerName) {
      const existing = db.customers.find(
        (c) => c.name.toLowerCase() === typedCustomerName.toLowerCase()
      );
      if (existing) {
        finalCustomerId = existing.id;
        finalCustomerName = existing.name;
        if (customerContactPhone && !existing.phone) {
          existing.phone = customerContactPhone.trim();
        }
      } else {
        finalCustomerId = `cust_${Date.now()}`;
        db.customers.push({
          id: finalCustomerId,
          name: typedCustomerName,
          contactPerson: typedCustomerName,
          phone: customerContactPhone?.trim() || '',
          billingAddress: deliveryLocation?.trim() || '',
          createdAt: now,
          updatedAt: now,
        });
      }
    } else if (customerId) {
      const existing = db.customers.find((c) => c.id === customerId);
      finalCustomerName = existing?.name || 'Customer';
    }

    const vehicle = db.vehicles.find((v) => v.id === vehicleId);
    const startOdo = odometerStart ? Number(odometerStart) : (vehicle?.currentOdometer || 0);
    const totalFreight = Number(freightAmount);
    const advance = Number(advanceReceived) || 0;
    const balanceDue = Math.max(0, totalFreight - advance);

    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (advance >= totalFreight) paymentStatus = 'paid';
    else if (advance > 0) paymentStatus = 'partial';

    const tripId = `trip_${Date.now()}`;
    const tripNumber = `TRIP-${new Date().getFullYear()}-${String(db.trips.length + 101).padStart(3, '0')}`;

    const newTrip: Trip = {
      id: tripId,
      tripNumber,
      bookingDate: now.slice(0, 10),
      vehicleId,
      driverId,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerContactPhone: customerContactPhone?.trim() || '',
      loadingLocation: loadingLocation.trim(),
      deliveryLocation: deliveryLocation.trim(),
      goodsDescription: goodsDescription?.trim() || 'General Cargo',
      weightKg: Number(weightKg) || 0,
      tripStartDate: tripStartDate || now,
      expectedDeliveryDate: expectedDeliveryDate || now,
      odometerStart: startOdo,
      freightAmount: totalFreight,
      advanceReceived: advance,
      balanceDue,
      paymentStatus,
      tripStatus: 'assigned',
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    db.trips.unshift(newTrip);

    // If an advance was received, record it as a formal trip payment transaction
    if (advance > 0) {
      const payment: TripPayment = {
        id: `pay_${Date.now()}`,
        tripId,
        customerId,
        amount: advance,
        paymentDate: now.slice(0, 10),
        paymentMethod: advancePaymentMethod || 'cash',
        transactionRef: advanceTxnRef || 'Booking Advance',
        notes: `Advance for trip ${tripNumber}`,
        createdAt: now,
      };
      db.tripPayments.push(payment);
    }

    // Notify assigned driver
    const driver = db.drivers.find((d) => d.id === driverId);
    if (driver) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        targetUserId: driver.userId,
        type: 'trip_update',
        title: `New Trip Assigned: ${tripNumber}`,
        message: `From ${loadingLocation} to ${deliveryLocation} (${goodsDescription || 'Cargo'}). Check details in My Trips.`,
        link: '/driver/trips',
        isRead: false,
        priority: 'high',
        createdAt: now,
      });
    }

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'CREATE_TRIP',
      'Trip',
      `Booked trip ${tripNumber} (Freight: ₹${totalFreight}) for vehicle ${vehicle?.regNumber}`,
      tripId
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, trip: newTrip });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}
