import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Customer } from '@/types';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDatabase();

    const customersWithFinancials = db.customers.map((c) => {
      const customerTrips = db.trips.filter((t) => t.customerId === c.id && t.tripStatus !== 'cancelled');
      const totalFreightBilled = customerTrips.reduce((sum, t) => sum + t.freightAmount, 0);

      const customerPayments = db.tripPayments.filter((p) => p.customerId === c.id);
      const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingBalance = Math.max(0, totalFreightBilled - totalPaid);

      return {
        ...c,
        totalTrips: customerTrips.length,
        totalFreightBilled,
        totalPaid,
        outstandingBalance,
      };
    });

    return NextResponse.json({ customers: customersWithFinancials });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, companyName, contactPerson, phone, email, billingAddress, gstin, notes } = body;

    if (!name || !contactPerson || !phone || !billingAddress) {
      return NextResponse.json({ error: 'Customer name, contact person, phone, and billing address are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: name.trim(),
      companyName: companyName?.trim() || name.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      billingAddress: billingAddress.trim(),
      gstin: gstin?.trim().toUpperCase() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.customers.push(newCustomer);
    logAudit(admin.id, admin.name, 'admin', 'CREATE_CUSTOMER', 'Customer', `Added customer: ${newCustomer.name}`, newCustomer.id);

    saveDatabase(db);
    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add customer' }, { status: 500 });
  }
}
