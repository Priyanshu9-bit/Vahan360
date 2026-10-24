import * as XLSX from 'xlsx';
import { DatabaseSchema } from '@/types';

export function generateMasterExcelWorkbook(db: DatabaseSchema): { buffer: Buffer; filename: string } {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Vahan360_Fleet_Master_Report_${dateStr}.xlsx`;

  // 1. Overview Sheet
  const validTrips = db.trips.filter((t) => t.tripStatus !== 'cancelled');
  const totalFreight = validTrips.reduce((sum, t) => sum + (Number(t.freightAmount) || 0), 0);
  const totalAdvance = validTrips.reduce((sum, t) => sum + (Number(t.advanceReceived) || 0), 0);
  const totalPayments = db.tripPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCollected = totalPayments > 0 ? totalPayments : totalAdvance;
  const totalBalanceDue = Math.max(0, totalFreight - totalCollected);

  const approvedExpenses = db.expenses.filter((e) => e.approvalStatus === 'approved');
  const totalDirectExpenses = approvedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalFuel = approvedExpenses.filter((e) => e.category === 'fuel').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalToll = approvedExpenses.filter((e) => e.category === 'toll_fastag').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalRepairs = approvedExpenses.filter((e) => e.category === 'repairs' || e.category === 'servicing').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalSalariesPaid = db.salaryPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const netFleetProfit = totalFreight - totalDirectExpenses;

  const overviewData = [
    { 'METRIC / FIELD': 'Business Enterprise Name', 'VALUE / AMOUNT': db.settings.businessName || 'Vahan360 Fleet' },
    { 'METRIC / FIELD': 'Tagline', 'VALUE / AMOUNT': db.settings.tagline || '' },
    { 'METRIC / FIELD': 'Fleet Owner Name', 'VALUE / AMOUNT': db.settings.ownerName || 'Admin' },
    { 'METRIC / FIELD': 'Registered Mobile', 'VALUE / AMOUNT': db.settings.phone || '' },
    { 'METRIC / FIELD': 'GSTIN', 'VALUE / AMOUNT': db.settings.gstin || 'Unregistered' },
    { 'METRIC / FIELD': 'Report Generated On', 'VALUE / AMOUNT': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { 'METRIC / FIELD': '--------------------------------', 'VALUE / AMOUNT': '--------------------------------' },
    { 'METRIC / FIELD': 'Total Fleet Vehicles', 'VALUE / AMOUNT': db.vehicles.length },
    { 'METRIC / FIELD': 'Active Operating Vehicles', 'VALUE / AMOUNT': db.vehicles.filter((v) => v.status === 'active').length },
    { 'METRIC / FIELD': 'Total Commercial Trips', 'VALUE / AMOUNT': db.trips.length },
    { 'METRIC / FIELD': 'Completed Trips', 'VALUE / AMOUNT': db.trips.filter((t) => t.tripStatus === 'completed').length },
    { 'METRIC / FIELD': 'Active In-Progress Trips', 'VALUE / AMOUNT': db.trips.filter((t) => t.tripStatus === 'in_progress').length },
    { 'METRIC / FIELD': 'Total Registered Drivers', 'VALUE / AMOUNT': db.drivers.length },
    { 'METRIC / FIELD': '--------------------------------', 'VALUE / AMOUNT': '--------------------------------' },
    { 'METRIC / FIELD': 'Total Agreed Freight Billed (₹)', 'VALUE / AMOUNT': totalFreight },
    { 'METRIC / FIELD': 'Total Freight Collections Received (₹)', 'VALUE / AMOUNT': totalCollected },
    { 'METRIC / FIELD': 'Outstanding Customer Balance Due (₹)', 'VALUE / AMOUNT': totalBalanceDue },
    { 'METRIC / FIELD': 'Total Direct Operating Expenses (₹)', 'VALUE / AMOUNT': totalDirectExpenses },
    { 'METRIC / FIELD': '  - Diesel & Fuel Costs (₹)', 'VALUE / AMOUNT': totalFuel },
    { 'METRIC / FIELD': '  - FASTag & Toll Charges (₹)', 'VALUE / AMOUNT': totalToll },
    { 'METRIC / FIELD': '  - Repairs & Maintenance (₹)', 'VALUE / AMOUNT': totalRepairs },
    { 'METRIC / FIELD': 'Total Driver Salaries Disbursed (₹)', 'VALUE / AMOUNT': totalSalariesPaid },
    { 'METRIC / FIELD': 'NET FLEET OPERATING PROFIT (₹)', 'VALUE / AMOUNT': netFleetProfit },
  ];
  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 38 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Executive Overview');

  // 2. Vehicles Sheet
  const vehiclesData = db.vehicles.map((v) => {
    const drv = db.drivers.find((d) => d.id === v.assignedDriverId);
    const vehTrips = db.trips.filter((t) => t.vehicleId === v.id && t.tripStatus !== 'cancelled');
    const vehFreight = vehTrips.reduce((sum, t) => sum + (Number(t.freightAmount) || 0), 0);
    const vehExpenses = db.expenses
      .filter((e) => e.vehicleId === v.id && e.approvalStatus === 'approved')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      'Vehicle Reg #': v.regNumber,
      'Vehicle Name': v.name,
      'Manufacturer': v.manufacturer,
      'Model': v.model,
      'Type': v.vehicleType,
      'Fuel Type': v.fuelType,
      'Current Odometer (km)': v.currentOdometer,
      'Operational Status': v.status.toUpperCase(),
      'Assigned Driver': drv ? `${drv.fullName} (${drv.phone})` : 'Unassigned',
      'Purchase Price (₹)': v.purchasePrice || 0,
      'Financer': v.loanDetails?.financer || 'None',
      'Monthly EMI (₹)': v.loanDetails?.emiAmount || 0,
      'Total Trips': vehTrips.length,
      'Total Freight Earned (₹)': vehFreight,
      'Total Direct Expenses (₹)': vehExpenses,
      'Net Operating Profit (₹)': vehFreight - vehExpenses,
    };
  });
  const wsVehicles = XLSX.utils.json_to_sheet(vehiclesData);
  wsVehicles['!cols'] = [
    { wch: 16 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 14 },
    { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 18 },
    { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsVehicles, 'Fleet Vehicles');

  // 3. Trips Sheet
  const tripsData = db.trips.map((t) => {
    const veh = db.vehicles.find((v) => v.id === t.vehicleId || (v.regNumber && (t as any).vehicleReg === v.regNumber));
    const drv = db.drivers.find((d) => d.id === t.driverId);
    const cust = db.customers.find((c) => c.id === t.customerId);
    const payments = db.tripPayments.filter((p) => p.tripId === t.id);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0) || Number(t.advanceReceived) || 0;
    const balance = Math.max(0, Number(t.freightAmount) - totalPaid);

    return {
      'Trip #': t.tripNumber,
      'Booking Date': t.bookingDate,
      'Vehicle Reg': veh?.regNumber || (t as any).vehicleReg || 'Unassigned',
      'Assigned Driver': drv?.fullName || (t as any).driverName || 'Unassigned',
      'Customer Name': cust?.name || t.customerName || 'Customer',
      'Customer Phone': t.customerContactPhone || '',
      'Loading Location': t.loadingLocation,
      'Delivery Destination': t.deliveryLocation,
      'Goods Description': t.goodsDescription,
      'Weight (kg)': t.weightKg,
      'Start Odometer (km)': t.odometerStart || 0,
      'End Odometer (km)': t.odometerEnd || 'In Transit',
      'Total Distance (km)': t.distanceKm || 0,
      'Agreed Freight (₹)': t.freightAmount,
      'Total Paid (₹)': totalPaid,
      'Balance Due (₹)': balance,
      'Payment Status': t.paymentStatus?.toUpperCase(),
      'Trip Status': t.tripStatus?.toUpperCase(),
      'Start Date': t.tripStartDate || '',
      'Completion Date': t.actualCompletionDate || '',
      'Notes': t.notes || '',
    };
  });
  const wsTrips = XLSX.utils.json_to_sheet(tripsData);
  wsTrips['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 24 },
    { wch: 16 }, { wch: 25 }, { wch: 25 }, { wch: 24 }, { wch: 12 },
    { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTrips, 'Commercial Trips');

  // 4. Expenses Sheet
  const expensesData = db.expenses.map((e) => {
    const veh = db.vehicles.find((v) => v.id === e.vehicleId);
    const drv = db.drivers.find((d) => d.id === e.driverId);
    const trp = db.trips.find((t) => t.id === e.tripId);

    return {
      'Expense Date': e.expenseDate,
      'Category': (e.category || '').replace(/_/g, ' ').toUpperCase(),
      'Amount (₹)': e.amount,
      'Payment Method': (e.paymentMethod || '').toUpperCase(),
      'Vehicle Reg': veh?.regNumber || '—',
      'Driver Name': drv?.fullName || '—',
      'Trip #': trp?.tripNumber || '—',
      'Vendor': e.vendor || '—',
      'Description': e.description,
      'Approval Status': (e.approvalStatus || '').toUpperCase(),
      'Approved By': e.approvedBy || '—',
      'Approval Notes': e.approvalNotes || '',
    };
  });
  const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
  wsExpenses['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 35 }, { wch: 16 },
    { wch: 16 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Direct Operating Expenses');

  // 5. Driver Salaries Sheet
  const salaryData = db.salaryRecords.map((s) => {
    const drv = db.drivers.find((d) => d.id === s.driverId);
    return {
      'Month Period': s.periodMonth,
      'Driver Name': drv?.fullName || 'Driver',
      'Driver Phone': drv?.phone || '',
      'Base Salary (₹)': s.baseSalary,
      'Trip Allowances (₹)': s.tripAllowance,
      'Bonus / Incentives (₹)': s.bonus || 0,
      'Advances Deducted (₹)': s.advancesDeducted,
      'Net Salary Payable (₹)': s.netPayable,
      'Amount Paid (₹)': s.paidAmount,
      'Remaining Balance Due (₹)': s.balanceDue,
      'Settlement Status': s.status.toUpperCase(),
    };
  });
  const wsSalaries = XLSX.utils.json_to_sheet(salaryData);
  wsSalaries['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSalaries, 'Driver Salaries');

  // 6. Customers Sheet
  const customersData = db.customers.map((c) => {
    const custTrips = db.trips.filter((t) => t.customerId === c.id && t.tripStatus !== 'cancelled');
    const totalBilled = custTrips.reduce((sum, t) => sum + (Number(t.freightAmount) || 0), 0);
    const custPayments = db.tripPayments
      .filter((p) => p.customerId === c.id || custTrips.some((t) => t.id === p.tripId))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Math.max(0, totalBilled - custPayments);

    return {
      'Customer Name': c.name,
      'Company Name': c.companyName || '—',
      'Contact Person': c.contactPerson,
      'Phone': c.phone,
      'Email': c.email || '—',
      'Billing Address': c.billingAddress,
      'GSTIN': c.gstin || 'Unregistered',
      'Total Trips': custTrips.length,
      'Total Freight Billed (₹)': totalBilled,
      'Total Collections Paid (₹)': custPayments,
      'Outstanding Balance Due (₹)': balanceDue,
    };
  });
  const wsCustomers = XLSX.utils.json_to_sheet(customersData);
  wsCustomers['!cols'] = [
    { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 22 },
    { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customer Ledger');

  // 7. Maintenance Records Sheet
  const maintenanceData = db.maintenanceRecords.map((m) => {
    const veh = db.vehicles.find((v) => v.id === m.vehicleId);
    return {
      'Vehicle Reg': veh?.regNumber || '—',
      'Service Date': m.serviceDate,
      'Odometer at Service (km)': m.odometerReading,
      'Service Center / Workshop': m.workshopName || '—',
      'Service Type': (m.serviceType || '').toUpperCase(),
      'Parts Replaced': m.partsReplaced || '—',
      'Parts Cost (₹)': m.partsCost || 0,
      'Labour Cost (₹)': m.labourCost || 0,
      'Total Cost (₹)': m.totalCost || 0,
      'Invoice / Bill Name': m.invoiceName || '—',
      'Next Service Due (km)': m.nextServiceOdometer || '—',
      'Next Service Due Date': m.nextServiceDate || '—',
      'Notes': m.notes || '',
    };
  });
  const wsMaintenance = XLSX.utils.json_to_sheet(maintenanceData);
  wsMaintenance['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 26 }, { wch: 16 },
    { wch: 26 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    { wch: 22 }, { wch: 22 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMaintenance, 'Maintenance Records');

  // 8. Challans Sheet
  const challansData = db.challans.map((c) => {
    const veh = db.vehicles.find((v) => v.id === c.vehicleId);
    return {
      'Challan #': c.challanNumber,
      'Vehicle Reg': veh?.regNumber || '—',
      'Challan Date': c.challanDate,
      'Violation Description': c.violationDescription,
      'Fine Amount (₹)': c.fineAmount,
      'Payment Status': (c.paymentStatus || '').toUpperCase(),
      'Payment Date': c.paymentDate || '—',
      'Payment Deadline': c.paymentDeadline || '—',
      'Notes': c.notes || '',
    };
  });
  const wsChallans = XLSX.utils.json_to_sheet(challansData);
  wsChallans['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 35 }, { wch: 16 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsChallans, 'Traffic Challans');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return { buffer: Buffer.from(buffer), filename };
}
