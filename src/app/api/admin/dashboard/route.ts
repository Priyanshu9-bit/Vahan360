import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import {
  calculateFinancialSummary,
  calculateVehicleProfitability,
  getMonthlyFinancialTrend,
  getExpenseCategoryBreakdown,
} from '@/lib/accounting';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDatabase();

    const financialSummary = calculateFinancialSummary(db);
    const vehicleProfitability = calculateVehicleProfitability(db);
    const monthlyTrend = getMonthlyFinancialTrend(db);
    const expenseBreakdown = getExpenseCategoryBreakdown(db);

    // Fleet stats
    const totalVehicles = db.vehicles.length;
    const activeVehicles = db.vehicles.filter((v) => v.status === 'active').length;
    const maintenanceVehicles = db.vehicles.filter((v) => v.status === 'in_service').length;

    // Driver stats
    const totalDrivers = db.drivers.length;
    const pendingDrivers = db.drivers.filter((d) => d.accountStatus === 'pending_approval').length;
    const approvedDrivers = db.drivers.filter((d) => d.accountStatus === 'approved').length;

    // Trip stats
    const activeTrips = db.trips.filter((t) => t.tripStatus === 'in_progress').length;
    const completedTrips = db.trips.filter((t) => t.tripStatus === 'completed').length;
    const plannedTrips = db.trips.filter((t) => t.tripStatus === 'planned' || t.tripStatus === 'assigned').length;

    // Document compliance
    const upcomingExpiringDocs = db.documents.filter((d) => d.status === 'expiring_soon');
    const expiredDocs = db.documents.filter((d) => d.status === 'expired');

    // Last backup info
    const lastBackup = db.backups[0] || null;

    // Recent activity feeds
    const recentTrips = [...db.trips]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((t) => {
        const veh = db.vehicles.find((v) => v.id === t.vehicleId);
        const drv = db.drivers.find((d) => d.id === t.driverId);
        const cust = db.customers.find((c) => c.id === t.customerId);
        return {
          ...t,
          vehicleReg: veh?.regNumber || 'Unknown',
          driverName: drv?.fullName || 'Unknown',
          customerName: cust?.name || 'Unknown',
        };
      });

    const pendingExpenses = db.expenses
      .filter((e) => e.approvalStatus === 'pending')
      .slice(0, 5)
      .map((e) => {
        const veh = db.vehicles.find((v) => v.id === e.vehicleId);
        const drv = db.drivers.find((d) => d.id === e.driverId);
        return {
          ...e,
          vehicleReg: veh?.regNumber || 'General',
          driverName: drv?.fullName || 'Admin',
        };
      });

    const pendingDriverApprovals = db.drivers
      .filter((d) => d.accountStatus === 'pending_approval')
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        totalDrivers,
        pendingDrivers,
        approvedDrivers,
        activeTrips,
        completedTrips,
        plannedTrips,
        upcomingDocExpiries: upcomingExpiringDocs.length,
        overdueDocuments: expiredDocs.length,
        ...financialSummary,
        lastBackup,
      },
      charts: {
        monthlyTrend,
        vehicleProfitability,
        expenseBreakdown,
      },
      recent: {
        trips: recentTrips,
        pendingExpenses,
        pendingDriverApprovals,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Access denied: Admin only.' }, { status: 403 });
    }
    console.error('Admin dashboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
