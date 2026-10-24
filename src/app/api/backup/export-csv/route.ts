import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { exportToCsv, getBackupTimestamp } from '@/lib/backup';
import { calculateVehicleProfitability } from '@/lib/accounting';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'vehicles';
    const db = getDatabase();

    let data: Record<string, any>[] = [];
    let filename = `Vahan360_${type}_${getBackupTimestamp()}.csv`;

    switch (type) {
      case 'vehicles':
        data = db.vehicles.map((v) => ({
          'Vehicle ID': v.id,
          'Registration Number': v.regNumber,
          Name: v.name,
          Manufacturer: v.manufacturer,
          Model: v.model,
          Type: v.vehicleType,
          'Fuel Type': v.fuelType,
          'Odometer (km)': v.currentOdometer,
          'Purchase Price': v.purchasePrice,
          Status: v.status,
        }));
        break;

      case 'drivers':
        data = db.drivers.map((d) => ({
          'Driver ID': d.id,
          'Full Name': d.fullName,
          Phone: d.phone,
          Email: d.email,
          'DL Number': d.dlNumber,
          'DL Expiry': d.dlExpiryDate,
          'Salary Type': d.salaryType,
          'Agreed Salary (₹)': d.agreedSalary,
          Status: d.accountStatus,
          'Joining Date': d.joiningDate,
        }));
        break;

      case 'trips':
        data = db.trips.map((t) => {
          const veh = db.vehicles.find((v) => v.id === t.vehicleId);
          const drv = db.drivers.find((d) => d.id === t.driverId);
          const cust = db.customers.find((c) => c.id === t.customerId);
          return {
            'Trip Number': t.tripNumber,
            BookingDate: t.bookingDate,
            Vehicle: veh?.regNumber || 'Unknown',
            Driver: drv?.fullName || 'Unknown',
            Customer: cust?.name || 'Unknown',
            From: t.loadingLocation,
            To: t.deliveryLocation,
            Cargo: t.goodsDescription,
            'Weight (kg)': t.weightKg,
            'Freight (₹)': t.freightAmount,
            'Advance (₹)': t.advanceReceived,
            'Balance Due (₹)': t.balanceDue,
            'Payment Status': t.paymentStatus,
            'Trip Status': t.tripStatus,
          };
        });
        break;

      case 'customers':
        data = db.customers.map((c) => {
          const trips = db.trips.filter((t) => t.customerId === c.id);
          const payments = db.tripPayments.filter((p) => p.customerId === c.id);
          const totalFreight = trips.reduce((sum, t) => sum + t.freightAmount, 0);
          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
          return {
            'Customer Name': c.name,
            Company: c.companyName || '',
            Contact: c.contactPerson,
            Phone: c.phone,
            Address: c.billingAddress,
            GSTIN: c.gstin || '',
            'Total Freight Billed (₹)': totalFreight,
            'Total Paid (₹)': totalPaid,
            'Outstanding Due (₹)': Math.max(0, totalFreight - totalPaid),
          };
        });
        break;

      case 'expenses':
        data = db.expenses.map((e) => {
          const veh = db.vehicles.find((v) => v.id === e.vehicleId);
          const drv = db.drivers.find((d) => d.id === e.driverId);
          return {
            Date: e.expenseDate,
            Category: e.category,
            'Amount (₹)': e.amount,
            Method: e.paymentMethod,
            Vehicle: veh?.regNumber || 'General',
            Driver: drv?.fullName || 'Admin',
            Vendor: e.vendor || '',
            Description: e.description,
            Status: e.approvalStatus,
          };
        });
        break;

      case 'payments':
        data = db.tripPayments.map((p) => {
          const trip = db.trips.find((t) => t.id === p.tripId);
          const cust = db.customers.find((c) => c.id === p.customerId);
          return {
            Date: p.paymentDate,
            'Trip Number': trip?.tripNumber || '',
            Customer: cust?.name || '',
            'Amount (₹)': p.amount,
            Method: p.paymentMethod,
            Reference: p.transactionRef || '',
            Notes: p.notes || '',
          };
        });
        break;

      case 'salaries':
        data = db.salaryRecords.map((s) => {
          const drv = db.drivers.find((d) => d.id === s.driverId);
          return {
            Period: s.periodMonth,
            Driver: drv?.fullName || '',
            'Base Salary (₹)': s.baseSalary,
            'Allowances (₹)': s.tripAllowance,
            'Advances Deducted (₹)': s.advancesDeducted,
            'Net Payable (₹)': s.netPayable,
            'Paid (₹)': s.paidAmount,
            'Balance Due (₹)': s.balanceDue,
            Status: s.status,
          };
        });
        break;

      case 'financials':
        data = calculateVehicleProfitability(db).map((vp) => ({
          Vehicle: vp.regNumber,
          Model: `${vp.name} (${vp.model})`,
          'Trips Completed': vp.tripCount,
          'Distance (km)': vp.totalDistance,
          'Freight Income (₹)': vp.totalFreight,
          'Fuel Cost (₹)': vp.fuelCost,
          'Maintenance Cost (₹)': vp.maintenanceCost,
          'Total Operating Expenses (₹)': vp.totalExpenses,
          'Net Operating Profit (₹)': vp.netProfit,
          'Margin (%)': `${vp.profitMargin}%`,
        }));
        break;

      default:
        return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 });
    }

    const csvContent = exportToCsv(data);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json(
        { error: 'Access Denied: Only the authorized Fleet Owner (Admin) can export business records.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
