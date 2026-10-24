import { DatabaseSchema, Trip, Expense, TripPayment } from '@/types';

// Helper to determine compliance document status and days remaining
export function computeDocumentStatus(expiryDate: string): { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number } {
  if (!expiryDate) return { status: 'valid', daysRemaining: 999 };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining };
  } else if (daysRemaining <= 30) {
    return { status: 'expiring_soon', daysRemaining };
  }
  return { status: 'valid', daysRemaining };
}

// Format currency as Indian Rupees (₹)
export function formatINR(amount: number | string | undefined | null): string {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

// Format Date in Asia/Kolkata
export function formatDateIST(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIST(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Calculate individual trip operating profit with strict arithmetic & itemized breakdown
export function calculateTripProfit(trip: Trip, expenses: Expense[]) {
  const freightAmount = Number(trip.freightAmount) || 0;
  const tripDate = (trip.tripStartDate || trip.bookingDate || '').slice(0, 10);

  const directExpenses = expenses.filter((e) => {
    if (e.approvalStatus !== 'approved') return false;
    if (e.tripId === trip.id) return true;
    // Fallback attribution: same vehicle and driver during trip date
    if (!e.tripId && trip.driverId && e.driverId === trip.driverId && trip.vehicleId && e.vehicleId === trip.vehicleId) {
      return (e.expenseDate || '').slice(0, 10) === tripDate;
    }
    return false;
  });

  const fuelCost = directExpenses
    .filter((e) => e.category === 'fuel')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const tollCost = directExpenses
    .filter((e) => e.category === 'toll_fastag')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const loadingCost = directExpenses
    .filter((e) => e.category === 'loading_unloading')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const driverAllowance = directExpenses
    .filter((e) => e.category === 'driver_allowance')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const repairsCost = directExpenses
    .filter((e) => ['repairs', 'servicing', 'spare_parts', 'tyres', 'engine_oil'].includes(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const otherTripCost = directExpenses
    .filter((e) => !['fuel', 'toll_fastag', 'loading_unloading', 'driver_allowance', 'repairs', 'servicing', 'spare_parts', 'tyres', 'engine_oil'].includes(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalDirectExpenses = fuelCost + tollCost + loadingCost + driverAllowance + repairsCost + otherTripCost;
  const netProfit = freightAmount - totalDirectExpenses;
  const profitMarginPercent = freightAmount > 0 ? (netProfit / freightAmount) * 100 : 0;

  const distanceKm = Number(trip.distanceKm) || (trip.odometerEnd && trip.odometerStart ? Math.max(0, Number(trip.odometerEnd) - Number(trip.odometerStart)) : 0);
  const costPerKm = distanceKm > 0 ? Math.round((totalDirectExpenses / distanceKm) * 100) / 100 : 0;
  const revenuePerKm = distanceKm > 0 ? Math.round((freightAmount / distanceKm) * 100) / 100 : 0;
  const profitPerKm = distanceKm > 0 ? Math.round((netProfit / distanceKm) * 100) / 100 : 0;

  return {
    freightAmount,
    fuelCost,
    tollCost,
    loadingCost,
    driverAllowance,
    repairsCost,
    otherTripCost,
    totalDirectExpenses,
    netProfit,
    profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
    distanceKm,
    costPerKm,
    revenuePerKm,
    profitPerKm,
    directExpensesList: directExpenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount) || 0,
      description: e.description,
      vendor: e.vendor || '—',
      paymentMethod: e.paymentMethod,
      expenseDate: e.expenseDate,
    })),
  };
}

// Business-wide Financial Summary (strictly computed from underlying records)
export function calculateFinancialSummary(db: DatabaseSchema) {
  // 1. Total Freight Income: sum of freight billed on non-cancelled trips
  const validTrips = db.trips.filter((t) => t.tripStatus !== 'cancelled');
  const totalFreightBilled = validTrips.reduce((sum, t) => sum + (Number(t.freightAmount) || 0), 0);

  // Total Payments actually collected from customers
  let totalPaymentsReceived = db.tripPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  for (const t of validTrips) {
    const hasRecordedPayment = db.tripPayments.some((p) => p.tripId === t.id);
    if (!hasRecordedPayment && Number(t.advanceReceived) > 0) {
      totalPaymentsReceived += Number(t.advanceReceived);
    }
  }

  // Customer outstanding balances
  const customerPendingDues = Math.max(0, totalFreightBilled - totalPaymentsReceived);

  // 2. Approved Business Operating Expenses (excluding EMI principal to maintain strict accounting standards)
  const approvedExpenses = db.expenses.filter((e) => e.approvalStatus === 'approved');

  const operatingExpenses = approvedExpenses.filter((e) => e.category !== 'vehicle_emi');
  const totalOperatingExpenses = operatingExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalEmiPayments = approvedExpenses
    .filter((e) => e.category === 'vehicle_emi')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 3. Maintenance Cost
  const totalMaintenanceCost = db.maintenanceRecords.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);

  // 4. Driver Salaries
  const totalSalariesPaid = db.salaryPayments
    .filter((p) => p.paymentType === 'salary')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalAdvancesIssued = db.salaryPayments
    .filter((p) => p.paymentType === 'advance')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingSalaryBalances = db.salaryRecords
    .filter((s) => s.status !== 'paid')
    .reduce((sum, s) => sum + (Number(s.balanceDue) || 0), 0);

  // 5. Operating Profit = Total Freight Billed - Total Operating Expenses
  const netOperatingProfit = totalFreightBilled - totalOperatingExpenses;
  const profitMarginPercent = totalFreightBilled > 0 ? Math.round((netOperatingProfit / totalFreightBilled) * 1000) / 10 : 0;
  const netCashFlow = totalPaymentsReceived - totalOperatingExpenses - totalEmiPayments - totalSalariesPaid;

  // 6. Fuel Analytics
  const fuelExpenses = approvedExpenses.filter((e) => e.category === 'fuel');
  const totalFuelCost = fuelExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 7. Challans summary
  const unpaidChallans = db.challans.filter((c) => c.paymentStatus === 'unpaid');
  const totalUnpaidChallansAmount = unpaidChallans.reduce((sum, c) => sum + (Number(c.fineAmount) || 0), 0);

  return {
    totalFreightBilled,
    totalPaymentsReceived,
    customerPendingDues,
    totalOperatingExpenses,
    totalEmiPayments,
    totalMaintenanceCost,
    totalSalariesPaid,
    totalAdvancesIssued,
    pendingSalaryBalances,
    netOperatingProfit,
    profitMarginPercent,
    netCashFlow,
    totalFuelCost,
    unpaidChallansCount: unpaidChallans.length,
    totalUnpaidChallansAmount,
  };
}

// Vehicle-wise Profitability Breakdown
export function calculateVehicleProfitability(db: DatabaseSchema) {
  return db.vehicles.map((v) => {
    const vehicleTrips = db.trips.filter((t) => t.vehicleId === v.id && t.tripStatus !== 'cancelled');
    const totalFreight = vehicleTrips.reduce((sum, t) => sum + (Number(t.freightAmount) || 0), 0);
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);

    const vehicleExpenses = db.expenses.filter(
      (e) => e.vehicleId === v.id && e.approvalStatus === 'approved' && e.category !== 'vehicle_emi'
    );
    const totalExpenses = vehicleExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const fuelCost = vehicleExpenses
      .filter((e) => e.category === 'fuel')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const tollCost = vehicleExpenses
      .filter((e) => e.category === 'toll_fastag')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const maintenanceCost = db.maintenanceRecords
      .filter((m) => m.vehicleId === v.id)
      .reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0) +
      vehicleExpenses
        .filter((e) => ['repairs', 'servicing', 'spare_parts', 'tyres', 'engine_oil'].includes(e.category))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const netProfit = totalFreight - totalExpenses;
    const profitMargin = totalFreight > 0 ? (netProfit / totalFreight) * 100 : 0;

    const costPerKm = totalDistance > 0 ? Math.round((totalExpenses / totalDistance) * 100) / 100 : 0;
    const revenuePerKm = totalDistance > 0 ? Math.round((totalFreight / totalDistance) * 100) / 100 : 0;
    const profitPerKm = totalDistance > 0 ? Math.round((netProfit / totalDistance) * 100) / 100 : 0;

    return {
      vehicleId: v.id,
      regNumber: v.regNumber,
      name: v.name,
      model: v.model,
      tripCount: vehicleTrips.length,
      totalDistance,
      totalFreight,
      fuelCost,
      tollCost,
      maintenanceCost,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      costPerKm,
      revenuePerKm,
      profitPerKm,
    };
  });
}

// Category breakdown for expenses with item counts and percentage shares
export function getExpenseCategoryBreakdown(db: DatabaseSchema) {
  const categories: Record<string, { amount: number; count: number }> = {};
  const approved = db.expenses.filter((e) => e.approvalStatus === 'approved');

  for (const exp of approved) {
    const key = exp.category;
    if (!categories[key]) {
      categories[key] = { amount: 0, count: 0 };
    }
    categories[key].amount += Number(exp.amount) || 0;
    categories[key].count += 1;
  }

  const categoryLabels: Record<string, string> = {
    fuel: 'Diesel & Fuel',
    toll_fastag: 'Tolls & FASTag',
    servicing: 'Vehicle Servicing',
    repairs: 'Workshop Repairs',
    engine_oil: 'Engine Oil & Lubricants',
    tyres: 'Tyres & Retreading',
    spare_parts: 'Spare Parts',
    driver_allowance: 'Driver Daily Allowance (Bhatta)',
    driver_advance: 'Driver Trip Advance',
    driver_salary: 'Driver Salary Disbursed',
    insurance: 'Insurance Policies',
    fitness_renewal: 'Fitness Certificates',
    puc: 'PUC Certificates',
    permit_renewal: 'Permits & Road Tax',
    road_tax: 'State Road Tax',
    challan_fine: 'Traffic Challans & Penalties',
    parking: 'Parking & Enclosures',
    loading_unloading: 'Loading & Labour (Hamali)',
    vehicle_emi: 'Vehicle Loan EMI Principal',
    administrative: 'Office & Admin Overhead',
    other: 'Miscellaneous Fleet Expenses',
  };

  const total = Object.values(categories).reduce((sum, c) => sum + c.amount, 0);

  return Object.entries(categories)
    .map(([category, data]) => ({
      categoryKey: category,
      category: categoryLabels[category] || category.replace(/_/g, ' ').toUpperCase(),
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Monthly Income vs Expenses Trend
export function getMonthlyFinancialTrend(db: DatabaseSchema) {
  const monthsMap: Record<string, { month: string; income: number; expenses: number; profit: number }> = {};

  // Seed last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    monthsMap[key] = { month: monthLabel, income: 0, expenses: 0, profit: 0 };
  }

  for (const trip of db.trips) {
    if (trip.tripStatus === 'cancelled') continue;
    const tripDate = trip.tripStartDate || trip.bookingDate;
    if (!tripDate) continue;
    const key = tripDate.slice(0, 7);
    if (monthsMap[key]) {
      monthsMap[key].income += Number(trip.freightAmount) || 0;
    }
  }

  for (const exp of db.expenses) {
    if (exp.approvalStatus !== 'approved' || exp.category === 'vehicle_emi') continue;
    const expDate = exp.expenseDate;
    if (!expDate) continue;
    const key = expDate.slice(0, 7);
    if (monthsMap[key]) {
      monthsMap[key].expenses += Number(exp.amount) || 0;
    }
  }

  for (const item of Object.values(monthsMap)) {
    item.profit = item.income - item.expenses;
  }

  return Object.values(monthsMap);
}

export interface DriverSettlementSummary {
  driverId: string;
  driverName: string;
  phone: string;
  accountStatus: string;
  salaryRecordsCount: number;
  unpaidSalaryDue: number;
  pendingExpenseClaims: number;
  approvedUnpaidExpenses: number;
  unreconciledAdvances: number;
  netPendingAmount: number;
  assignedVehicle?: {
    id: string;
    regNumber: string;
    name: string;
  };
  activeTrips: Array<{
    id: string;
    tripNumber: string;
    tripStatus: string;
    route: string;
  }>;
  hasDuesPending: boolean;
  statusNotice: string;
}

// Calculate comprehensive pending dues, salary balance, and settlement sheet for a driver
export function calculateDriverSettlementSummary(
  driverId: string,
  db: {
    drivers: any[];
    salaryRecords?: any[];
    salaryPayments?: any[];
    expenses?: any[];
    trips?: any[];
    vehicles?: any[];
  }
): DriverSettlementSummary {
  const driver = (db.drivers || []).find((d) => d.id === driverId);
  const driverName = driver ? driver.fullName : 'Driver';
  const phone = driver ? driver.phone : '';
  const accountStatus = driver ? driver.accountStatus : 'unknown';

  // 1. Unpaid salary balances from monthly slips
  const driverSalaryRecords = (db.salaryRecords || []).filter((s) => s.driverId === driverId);
  const unpaidSalaryDue = driverSalaryRecords.reduce((sum, s) => {
    const bal = Number(s.balanceDue) || 0;
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  // 2. Driver-incurred expenses
  const driverExpenses = (db.expenses || []).filter(
    (e) => e.driverId === driverId || (driver && e.submittedBy === driver.userId)
  );

  // Approved out-of-pocket expenses (cash or personal upi paid by driver)
  const approvedUnpaidExpenses = driverExpenses
    .filter((e) => e.approvalStatus === 'approved' && (e.paymentMethod === 'cash' || e.paymentMethod === 'upi'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Pending approval claims
  const pendingExpenseClaims = driverExpenses
    .filter((e) => e.approvalStatus === 'pending')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 3. Advances reconciliation
  const advancesGiven = (db.salaryPayments || [])
    .filter((p) => p.driverId === driverId && p.paymentType === 'advance')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const advancesDeductedInSlips = driverSalaryRecords.reduce(
    (sum, s) => sum + (Number(s.advancesDeducted) || 0),
    0
  );
  const unreconciledAdvances = Math.max(0, advancesGiven - advancesDeductedInSlips);

  // Net Pending Amount (positive = Company owes driver; negative = Driver owes company)
  const netPendingAmount = Math.round((unpaidSalaryDue + approvedUnpaidExpenses - unreconciledAdvances) * 100) / 100;

  // 4. Vehicle & Trip status
  const veh = driver?.assignedVehicleId
    ? (db.vehicles || []).find((v) => v.id === driver.assignedVehicleId)
    : undefined;
  const assignedVehicle = veh
    ? { id: veh.id, regNumber: veh.regNumber, name: veh.name }
    : undefined;

  const activeTrips = (db.trips || [])
    .filter((t) => t.driverId === driverId && (t.tripStatus === 'assigned' || t.tripStatus === 'in_progress'))
    .map((t) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      tripStatus: t.tripStatus,
      route: `${t.loadingLocation || ''} -> ${t.deliveryLocation || ''}`,
    }));

  let statusNotice = 'All dues settled. Net pending balance is ₹0.';
  if (netPendingAmount > 0) {
    statusNotice = `Company owes ₹${netPendingAmount.toLocaleString('en-IN')} to ${driverName}.`;
  } else if (netPendingAmount < 0) {
    statusNotice = `${driverName} owes ₹${Math.abs(netPendingAmount).toLocaleString('en-IN')} advance balance to Company.`;
  }

  return {
    driverId,
    driverName,
    phone,
    accountStatus,
    salaryRecordsCount: driverSalaryRecords.length,
    unpaidSalaryDue,
    pendingExpenseClaims,
    approvedUnpaidExpenses,
    unreconciledAdvances,
    netPendingAmount,
    assignedVehicle,
    activeTrips,
    hasDuesPending: netPendingAmount !== 0 || pendingExpenseClaims > 0,
    statusNotice,
  };
}
