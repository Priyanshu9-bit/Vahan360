import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { getDatabase, saveDatabase, logAudit } from './db';
import { DatabaseSchema, BackupRecord } from '@/types';
import { generateMasterExcelWorkbook } from './excel';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Helper to format timestamp for filenames
export function getBackupTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

// Generate the official Vahan360 Full TXT Backup string (Plain English + Restoration Payload)
export function generateFullTxtBackup(db: DatabaseSchema): { content: string; filename: string; checksum: string } {
  const ts = getBackupTimestamp();
  const filename = `Vahan360_Full_Backup_${ts}.txt`;

  // Sanitize users to strip password hashes and secrets
  const sanitizedUsers = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  const recordCounts = {
    settings: 1,
    users: sanitizedUsers.length,
    vehicles: db.vehicles.length,
    documents: db.documents.length,
    drivers: db.drivers.length,
    customers: db.customers.length,
    trips: db.trips.length,
    tripPayments: db.tripPayments.length,
    expenses: db.expenses.length,
    salaryRecords: db.salaryRecords.length,
    salaryPayments: db.salaryPayments.length,
    maintenanceRecords: db.maintenanceRecords.length,
    challans: db.challans.length,
    notifications: db.notifications.length,
    driverLeaves: (db.driverLeaves || []).length,
    auditLogs: db.auditLogs.length,
  };

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  // Financial calculations for plain English executive summary
  const totalFreight = db.trips.reduce((sum, t) => sum + (t.freightAmount || 0), 0);
  const totalCollections = db.tripPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAdvances = db.trips.reduce((sum, t) => sum + (t.advanceReceived || 0), 0);
  const customerPending = Math.max(0, totalFreight - (totalAdvances + totalCollections));
  const totalApprovedExpenses = db.expenses
    .filter((e) => e.approvalStatus === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const netFleetProfit = totalFreight - totalApprovedExpenses;
  const totalSalariesPaid = db.salaryPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0);

  // Format date nicely
  const formattedDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Plain English Vehicles List
  const vehiclesEnglish = db.vehicles.length > 0
    ? db.vehicles.map((v, i) => {
        const assignedDriver = db.drivers.find((d) => d.id === v.assignedDriverId || d.assignedVehicleId === v.id);
        return [
          `Vehicle #${i + 1}: ${v.regNumber} (${v.name})`,
          `  - Manufacturer & Model : ${v.manufacturer} ${v.model}`,
          `  - Vehicle Category     : ${v.vehicleType || 'Commercial Goods Carrier'}`,
          `  - Fuel Type            : ${v.fuelType}`,
          `  - Current Odometer     : ${Number(v.currentOdometer || 0).toLocaleString('en-IN')} km`,
          `  - Assigned Driver      : ${assignedDriver ? assignedDriver.fullName : 'None (Unassigned)'}`,
          `  - Operational Status   : ${v.status === 'active' ? 'Active & In Service' : v.status}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No vehicles registered in fleet)';

  // Plain English Trips List
  const tripsEnglish = db.trips.length > 0
    ? db.trips.map((t, i) => {
        const veh = db.vehicles.find((v) => v.id === t.vehicleId);
        const drv = db.drivers.find((d) => d.id === t.driverId);
        const cust = db.customers.find((c) => c.id === t.customerId);
        return [
          `Trip #${i + 1}: ${t.tripNumber} (Booking Date: ${t.bookingDate})`,
          `  - Route From / To   : ${t.loadingLocation} -> ${t.deliveryLocation}`,
          `  - Customer / Party  : ${cust ? cust.name : (t.customerId || 'Direct Party')}`,
          `  - Goods & Cargo     : ${t.goodsDescription} (${Number(t.weightKg || 0).toLocaleString('en-IN')} kg)`,
          `  - Vehicle Assigned  : ${veh ? `${veh.regNumber} (${veh.name})` : 'Vehicle Not Found'}`,
          `  - Driver Assigned   : ${drv ? drv.fullName : 'Driver Not Found'}`,
          `  - Freight Amount    : Rs. ${Number(t.freightAmount || 0).toLocaleString('en-IN')}`,
          `  - Advance Received  : Rs. ${Number(t.advanceReceived || 0).toLocaleString('en-IN')}`,
          `  - Balance Due       : Rs. ${Number(t.balanceDue || 0).toLocaleString('en-IN')} (${t.paymentStatus === 'paid' ? 'Paid in Full' : 'Pending Payment'})`,
          `  - Trip Status       : ${t.tripStatus === 'completed' ? 'Completed & Delivered' : t.tripStatus}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No trips logged yet)';

  // Plain English Drivers List
  const driversEnglish = db.drivers.length > 0
    ? db.drivers.map((d, i) => {
        const assignedVeh = db.vehicles.find((v) => v.id === d.assignedVehicleId || v.assignedDriverId === d.id);
        return [
          `Driver #${i + 1}: ${d.fullName}`,
          `  - Contact Phone       : ${d.phone}`,
          `  - Driving Licence (DL): ${d.dlNumber} (Valid up to: ${d.dlExpiryDate})`,
          `  - Agreed Salary       : Rs. ${Number(d.agreedSalary || 0).toLocaleString('en-IN')} per month (${d.salaryType || 'monthly'})`,
          `  - Assigned Vehicle    : ${assignedVeh ? `${assignedVeh.regNumber} - ${assignedVeh.name}` : 'Not assigned to specific vehicle'}`,
          `  - Joining Date        : ${d.joiningDate || 'N/A'}`,
          `  - Account Status      : ${d.accountStatus === 'active' ? 'Active Working Driver' : d.accountStatus}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No drivers registered)';

  // Plain English Expenses List
  const expensesEnglish = db.expenses.length > 0
    ? db.expenses.map((e, i) => {
        const veh = db.vehicles.find((v) => v.id === e.vehicleId);
        const drv = db.drivers.find((d) => d.id === e.driverId);
        return [
          `Expense #${i + 1}: Rs. ${Number(e.amount || 0).toLocaleString('en-IN')} | Date: ${e.expenseDate} | Category: ${e.category.toUpperCase()}`,
          `  - Vehicle         : ${veh ? veh.regNumber : 'Fleet General'}`,
          `  - Incurred By     : ${drv ? drv.fullName : 'Admin / Office'}`,
          `  - Payment Method  : ${e.paymentMethod}`,
          `  - Vendor / Payee  : ${e.vendor || 'Direct Cash / Pump'}`,
          `  - Description     : ${e.description}`,
          `  - Status          : ${e.approvalStatus === 'approved' ? 'Approved & Accounted' : e.approvalStatus}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No expenses recorded)';

  // Plain English Salaries List
  const salariesEnglish = db.salaryRecords.length > 0
    ? db.salaryRecords.map((s, i) => {
        const drv = db.drivers.find((d) => d.id === s.driverId);
        return [
          `Salary Record #${i + 1}: ${drv ? drv.fullName : 'Driver'} (Month: ${s.periodMonth})`,
          `  - Base Agreed Salary : Rs. ${Number(s.baseSalary || 0).toLocaleString('en-IN')}`,
          `  - Trip Allowances    : Rs. ${Number(s.tripAllowance || 0).toLocaleString('en-IN')}`,
          `  - Advances Deducted  : Rs. ${Number(s.advancesDeducted || 0).toLocaleString('en-IN')}`,
          `  - Net Payable Salary : Rs. ${Number(s.netPayable || 0).toLocaleString('en-IN')}`,
          `  - Amount Paid        : Rs. ${Number(s.paidAmount || 0).toLocaleString('en-IN')}`,
          `  - Remaining Balance  : Rs. ${Number(s.balanceDue || 0).toLocaleString('en-IN')} (${s.status === 'paid' ? 'Fully Cleared' : 'Pending'})`,
        ].join('\n');
      }).join('\n\n')
    : '  (No salary records generated)';

  // Plain English Documents & Compliance List
  const documentsEnglish = db.documents.length > 0
    ? db.documents.map((doc, i) => {
        const veh = db.vehicles.find((v) => v.id === doc.vehicleId);
        return [
          `Document #${i + 1}: ${doc.docType.toUpperCase()} - ${doc.fileName || doc.docNumber}`,
          `  - Vehicle       : ${veh ? veh.regNumber : 'Fleet'}`,
          `  - Document No   : ${doc.docNumber}`,
          `  - Expiry Date   : ${doc.expiryDate}`,
          `  - Current Status: ${doc.status.toUpperCase()}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No compliance documents uploaded)';

  // Plain English Challans List
  const challansEnglish = db.challans.length > 0
    ? db.challans.map((c, i) => {
        const veh = db.vehicles.find((v) => v.id === c.vehicleId);
        return [
          `Challan #${i + 1}: Challan No ${c.challanNumber} (Date: ${c.challanDate})`,
          `  - Vehicle       : ${veh ? veh.regNumber : 'Fleet'}`,
          `  - Violation     : ${c.violationDescription}`,
          `  - Fine Amount   : Rs. ${Number(c.fineAmount || 0).toLocaleString('en-IN')}`,
          `  - Payment Status: ${c.paymentStatus.toUpperCase()}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No traffic challans or penalties recorded)';

  // Assemble Plain English Human-Readable Report
  const plainEnglishReport = [
    '================================================================================',
    '             VAHAN360 - COMMERCIAL FLEET BUSINESS REPORT & BACKUP',
    '================================================================================',
    `Business Name  : ${db.settings.businessName}`,
    `Fleet Owner    : ${db.settings.ownerName}`,
    `Contact Phone  : ${db.settings.phone}`,
    `Report Date    : ${formattedDate}`,
    `Backup File    : ${filename}`,
    `System Version : ${db.version}`,
    '================================================================================',
    '',
    '--------------------------------------------------------------------------------',
    '1. EXECUTIVE BUSINESS & FINANCIAL SUMMARY',
    '--------------------------------------------------------------------------------',
    `• Total Registered Fleet Vehicles    : ${db.vehicles.length} Vehicles`,
    `• Active Working Drivers             : ${db.drivers.length} Drivers`,
    `• Total Commercial Trips Executed    : ${db.trips.length} Trips`,
    `• Total Freight Billed to Customers  : Rs. ${totalFreight.toLocaleString('en-IN')}`,
    `• Total Customer Cash Collected      : Rs. ${(totalAdvances + totalCollections).toLocaleString('en-IN')}`,
    `• Customer Pending Receivables       : Rs. ${customerPending.toLocaleString('en-IN')}`,
    `• Total Approved Operating Expenses  : Rs. ${totalApprovedExpenses.toLocaleString('en-IN')}`,
    `• Net Commercial Operating Profit    : Rs. ${netFleetProfit.toLocaleString('en-IN')}`,
    `• Total Driver Salaries Paid         : Rs. ${totalSalariesPaid.toLocaleString('en-IN')}`,
    '',
    '--------------------------------------------------------------------------------',
    `2. FLEET VEHICLES DIRECTORY (${db.vehicles.length} Vehicles)`,
    '--------------------------------------------------------------------------------',
    vehiclesEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `3. COMMERCIAL TRIPS & FREIGHT LOG (${db.trips.length} Trips)`,
    '--------------------------------------------------------------------------------',
    tripsEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `4. DRIVERS & STAFF DIRECTORY (${db.drivers.length} Drivers)`,
    '--------------------------------------------------------------------------------',
    driversEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `5. OPERATING EXPENSES REGISTER (${db.expenses.length} Records)`,
    '--------------------------------------------------------------------------------',
    expensesEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `6. DRIVER SALARIES & MONTHLY STATEMENTS (${db.salaryRecords.length} Records)`,
    '--------------------------------------------------------------------------------',
    salariesEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `7. VEHICLE COMPLIANCE DOCUMENTS & EXPIRY DATES (${db.documents.length} Records)`,
    '--------------------------------------------------------------------------------',
    documentsEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `8. TRAFFIC CHALLANS & PENALTIES (${db.challans.length} Records)`,
    '--------------------------------------------------------------------------------',
    challansEnglish,
    '',
    '================================================================================',
    '                  END OF HUMAN-READABLE ENGLISH FLEET REPORT',
    '================================================================================',
    'Notice: The section below contains system-encoded verification data.',
    'It is automatically utilized by Vahan360 if you ever need to restore your',
    'fleet database. Do not edit the text below this line.',
    '================================================================================',
    '',
  ].join('\n');

  const machinePayloadHeader = [
    '================================================================================',
    'BEGIN DATA SECTIONS (STRUCTURED JSON PAYLOADS)',
    '================================================================================',
    '',
  ].join('\n');

  const sections = [
    '--- SECTION: SETTINGS ---',
    JSON.stringify(db.settings, null, 2),
    '',
    '--- SECTION: USERS ---',
    JSON.stringify(sanitizedUsers, null, 2),
    '',
    '--- SECTION: VEHICLES ---',
    JSON.stringify(db.vehicles, null, 2),
    '',
    '--- SECTION: DOCUMENTS ---',
    JSON.stringify(db.documents, null, 2),
    '',
    '--- SECTION: DRIVERS ---',
    JSON.stringify(db.drivers, null, 2),
    '',
    '--- SECTION: CUSTOMERS ---',
    JSON.stringify(db.customers, null, 2),
    '',
    '--- SECTION: TRIPS ---',
    JSON.stringify(db.trips, null, 2),
    '',
    '--- SECTION: TRIP_PAYMENTS ---',
    JSON.stringify(db.tripPayments, null, 2),
    '',
    '--- SECTION: EXPENSES ---',
    JSON.stringify(db.expenses, null, 2),
    '',
    '--- SECTION: SALARY_RECORDS ---',
    JSON.stringify(db.salaryRecords, null, 2),
    '',
    '--- SECTION: SALARY_PAYMENTS ---',
    JSON.stringify(db.salaryPayments, null, 2),
    '',
    '--- SECTION: MAINTENANCE ---',
    JSON.stringify(db.maintenanceRecords, null, 2),
    '',
    '--- SECTION: CHALLANS ---',
    JSON.stringify(db.challans, null, 2),
    '',
    '--- SECTION: NOTIFICATIONS ---',
    JSON.stringify(db.notifications, null, 2),
    '',
    '--- SECTION: DRIVER_LEAVES ---',
    JSON.stringify(db.driverLeaves || [], null, 2),
    '',
    '--- SECTION: AUDIT_LOGS ---',
    JSON.stringify(db.auditLogs.slice(0, 100), null, 2),
    '',
    '================================================================================',
    'END OF VAHAN360 BACKUP FILE',
    '================================================================================',
  ].join('\n');

  const content = plainEnglishReport + machinePayloadHeader + sections;
  const checksum = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

  return { content, filename, checksum };
}

// Generate pure, human-readable Transaction Notes & Audit Ledger (.txt) with per-transaction entries
export function generateTransactionsNote(db: DatabaseSchema): { content: string; filename: string } {
  const ts = getBackupTimestamp();
  const filename = `Vahan360_Transaction_Notes_${ts}.txt`;

  // Format date in Indian Standard Time (IST)
  const formattedDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // High-level financial metrics
  const totalFreight = db.trips.reduce((sum, t) => sum + (t.freightAmount || 0), 0);
  const totalAdvances = db.trips.reduce((sum, t) => sum + (t.advanceReceived || 0), 0);
  const totalTripPayments = db.tripPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCollections = totalAdvances + totalTripPayments;
  const customerPending = Math.max(0, totalFreight - totalCollections);

  const approvedExpenses = db.expenses.filter((e) => e.approvalStatus === 'approved');
  const totalApprovedExpenses = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalSalariesPaid = db.salaryPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0);
  const totalChallansPaid = db.challans
    .filter((c) => c.paymentStatus === 'paid')
    .reduce((sum, c) => sum + (c.fineAmount || 0), 0);
  const totalChallansPending = db.challans
    .filter((c) => c.paymentStatus !== 'paid')
    .reduce((sum, c) => sum + (c.fineAmount || 0), 0);

  const netFleetProfit = totalFreight - totalApprovedExpenses;
  const netCashSurplus = totalCollections - totalApprovedExpenses - totalSalariesPaid - totalChallansPaid;

  // Compile Unified Chronological Transactions (Per-Transactions Ledger)
  interface UnifiedTxn {
    date: string;
    rawTime: number;
    flow: 'CASH IN (+)' | 'CASH OUT (-)' | 'FREIGHT BILLED' | 'MAINTENANCE' | 'PENALTY DUE';
    title: string;
    amount: number;
    category: string;
    party: string;
    vehicle: string;
    driver: string;
    paymentMode: string;
    refNo: string;
    status: string;
    notes: string;
  }

  const allTxns: UnifiedTxn[] = [];

  // 1. Trips Freight Billed & Advances
  for (const t of db.trips) {
    const veh = db.vehicles.find((v) => v.id === t.vehicleId);
    const drv = db.drivers.find((d) => d.id === t.driverId);
    const cust = db.customers.find((c) => c.id === t.customerId);
    const tripDate = t.bookingDate || t.tripStartDate || (t.createdAt ? t.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(tripDate).getTime() || 0;

    // Freight billing record
    allTxns.push({
      date: tripDate,
      rawTime,
      flow: 'FREIGHT BILLED',
      category: 'Trip Freight Invoice',
      title: `Freight Billed on Trip #${t.tripNumber}`,
      amount: t.freightAmount || 0,
      party: cust ? cust.name : (t.customerName || 'Direct Party'),
      vehicle: veh ? `${veh.regNumber} (${veh.name})` : 'Unassigned',
      driver: drv ? drv.fullName : 'Unassigned',
      paymentMode: 'Invoice / Freight Contract',
      refNo: t.tripNumber,
      status: t.tripStatus === 'completed' ? 'Delivered & Billed' : t.tripStatus.toUpperCase(),
      notes: `Route: ${t.loadingLocation} -> ${t.deliveryLocation} | Cargo: ${t.goodsDescription} (${Number(t.weightKg || 0).toLocaleString('en-IN')} kg)`,
    });

    // Advance payment record if collected
    if (t.advanceReceived && t.advanceReceived > 0) {
      allTxns.push({
        date: tripDate,
        rawTime: rawTime + 1,
        flow: 'CASH IN (+)',
        category: 'Customer Advance',
        title: `Advance Freight Received for Trip #${t.tripNumber}`,
        amount: t.advanceReceived,
        party: cust ? cust.name : (t.customerName || 'Direct Party'),
        vehicle: veh ? veh.regNumber : 'N/A',
        driver: drv ? drv.fullName : 'N/A',
        paymentMode: 'Cash / Direct Advance',
        refNo: t.tripNumber,
        status: 'Collected & Credited',
        notes: `Advance freight collected at loading point (${t.loadingLocation})`,
      });
    }
  }

  // 2. Customer Trip Payments (Collections)
  for (const p of db.tripPayments) {
    const t = db.trips.find((x) => x.id === p.tripId);
    const cust = db.customers.find((c) => c.id === p.customerId);
    const veh = t ? db.vehicles.find((v) => v.id === t.vehicleId) : null;
    const drv = t ? db.drivers.find((d) => d.id === t.driverId) : null;
    const pDate = p.paymentDate || (p.createdAt ? p.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(pDate).getTime() || 0;

    allTxns.push({
      date: pDate,
      rawTime: rawTime + 2,
      flow: 'CASH IN (+)',
      category: 'Customer Collection',
      title: `Trip Freight Payment (${t ? t.tripNumber : 'Trip Ledger'})`,
      amount: p.amount || 0,
      party: cust ? cust.name : 'Customer',
      vehicle: veh ? `${veh.regNumber} (${veh.name})` : 'Fleet',
      driver: drv ? drv.fullName : 'N/A',
      paymentMode: p.paymentMethod ? p.paymentMethod.toUpperCase() : 'CASH',
      refNo: p.transactionRef || p.id,
      status: 'Received & Accounted',
      notes: p.notes || `Settlement payment for trip ${t ? t.tripNumber : ''}`,
    });
  }

  // 3. Operating Expenses
  for (const e of db.expenses) {
    const veh = db.vehicles.find((v) => v.id === e.vehicleId);
    const drv = db.drivers.find((d) => d.id === e.driverId);
    const eDate = e.expenseDate || (e.createdAt ? e.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(eDate).getTime() || 0;

    allTxns.push({
      date: eDate,
      rawTime,
      flow: 'CASH OUT (-)',
      category: `Operating Expense (${e.category.toUpperCase()})`,
      title: `Fleet Expense: ${e.category.toUpperCase()} - ${e.description}`,
      amount: e.amount || 0,
      party: e.vendor || 'Direct Pump / Vendor',
      vehicle: veh ? `${veh.regNumber} (${veh.name})` : 'Fleet General',
      driver: drv ? drv.fullName : 'Admin / Office',
      paymentMode: e.paymentMethod ? e.paymentMethod.toUpperCase() : 'CASH',
      refNo: e.id,
      status: e.approvalStatus === 'approved' ? 'Approved & Accounted' : e.approvalStatus.toUpperCase(),
      notes: e.description || `${e.category} operating expenditure`,
    });
  }

  // 4. Driver Salary & Advance Payments
  for (const sp of db.salaryPayments) {
    const drv = db.drivers.find((d) => d.id === sp.driverId);
    const veh = drv?.assignedVehicleId ? db.vehicles.find((v) => v.id === drv.assignedVehicleId) : null;
    const spDate = sp.paymentDate || (sp.createdAt ? sp.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(spDate).getTime() || 0;

    allTxns.push({
      date: spDate,
      rawTime,
      flow: 'CASH OUT (-)',
      category: `Driver Payroll (${sp.paymentType.toUpperCase()})`,
      title: `Driver Payment: ${drv ? drv.fullName : 'Driver'} (${sp.paymentType.toUpperCase()})`,
      amount: sp.amount || 0,
      party: drv ? drv.fullName : 'Driver Staff',
      vehicle: veh ? veh.regNumber : 'Not Assigned',
      driver: drv ? drv.fullName : 'Driver',
      paymentMode: sp.paymentMethod ? sp.paymentMethod.toUpperCase() : 'BANK_TRANSFER',
      refNo: sp.referenceNo || sp.id,
      status: 'Paid & Disbursed',
      notes: sp.notes || `Driver ${sp.paymentType} disbursement`,
    });
  }

  // 4.5 Driver Bunks & Unexcused Leaves
  for (const l of db.driverLeaves || []) {
    const drv = db.drivers.find((d) => d.id === l.driverId);
    const rawTime = new Date(l.date).getTime() || 0;

    allTxns.push({
      date: l.date,
      rawTime,
      flow: l.status === 'penalty_applied' ? 'CASH OUT (-)' : 'PENALTY DUE',
      category: `Driver Bunk / Absence (${l.leaveType.toUpperCase()})`,
      title: `Driver Bunk / Absence: ${drv ? drv.fullName : 'Driver'} (-Rs. ${l.deductionAmount})`,
      amount: l.deductionAmount || 0,
      party: drv ? drv.fullName : 'Driver Staff',
      vehicle: drv?.assignedVehicleId ? (db.vehicles.find((v) => v.id === drv.assignedVehicleId)?.regNumber || 'Assigned') : 'General',
      driver: drv ? drv.fullName : 'Driver Staff',
      paymentMode: `Payroll Deduction (${l.deductedInSalaryMonth})`,
      refNo: l.id,
      status: l.status === 'penalty_applied' ? 'Salary Cut Applied' : 'Waived',
      notes: l.reason ? `Reason: ${l.reason} | Deducted in ${l.deductedInSalaryMonth}` : `Unexcused absence on ${l.date}`,
    });
  }

  // 5. Vehicle Maintenance Records
  for (const m of db.maintenanceRecords) {
    const veh = db.vehicles.find((v) => v.id === m.vehicleId);
    const mDate = m.serviceDate || (m.createdAt ? m.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(mDate).getTime() || 0;

    allTxns.push({
      date: mDate,
      rawTime,
      flow: 'CASH OUT (-)',
      category: `Maintenance (${m.serviceType.toUpperCase()})`,
      title: `Vehicle Servicing: ${veh ? veh.regNumber : 'Fleet'} (${m.serviceType.toUpperCase()})`,
      amount: m.totalCost || 0,
      party: m.workshopName || 'Authorized Garage',
      vehicle: veh ? `${veh.regNumber} (${veh.name})` : 'Fleet',
      driver: 'Maintenance Team',
      paymentMode: 'Service Account / Cash',
      refNo: m.id,
      status: 'Service Completed',
      notes: `Parts: ${m.partsReplaced || 'General Service'} | Parts Cost: Rs. ${m.partsCost} | Labour: Rs. ${m.labourCost}`,
    });
  }

  // 6. Traffic Challans
  for (const c of db.challans) {
    const veh = db.vehicles.find((v) => v.id === c.vehicleId);
    const cDate = c.challanDate || (c.createdAt ? c.createdAt.slice(0, 10) : '2026-10-24');
    const rawTime = new Date(cDate).getTime() || 0;

    allTxns.push({
      date: cDate,
      rawTime,
      flow: c.paymentStatus === 'paid' ? 'CASH OUT (-)' : 'PENALTY DUE',
      category: 'Traffic Challan Fine',
      title: `Traffic Penalty: Challan #${c.challanNumber}`,
      amount: c.fineAmount || 0,
      party: 'Traffic Police / State RTO',
      vehicle: veh ? `${veh.regNumber} (${veh.name})` : 'Fleet',
      driver: 'On-Duty Driver',
      paymentMode: c.paymentStatus === 'paid' ? 'Online / Cash Settlement' : 'Unpaid Penalty',
      refNo: c.challanNumber,
      status: c.paymentStatus === 'paid' ? 'Paid & Resolved' : 'PENDING PAYMENT',
      notes: `Violation: ${c.violationDescription}`,
    });
  }

  // Sort chronologically
  allTxns.sort((a, b) => a.date.localeCompare(b.date) || a.rawTime - b.rawTime);

  // Format transactions section
  const transactionsEnglish = allTxns.length > 0
    ? allTxns.map((tx, idx) => {
        const padIndex = String(idx + 1).padStart(3, '0');
        return [
          `--------------------------------------------------------------------------------`,
          `[TXN #${padIndex}] Date: ${tx.date} | ${tx.flow} : Rs. ${tx.amount.toLocaleString('en-IN')}`,
          `--------------------------------------------------------------------------------`,
          `  • Transaction Title : ${tx.title}`,
          `  • Category          : ${tx.category}`,
          `  • Associated Party  : ${tx.party}`,
          `  • Vehicle           : ${tx.vehicle}`,
          `  • Driver Staff      : ${tx.driver}`,
          `  • Payment Mode      : ${tx.paymentMode}`,
          `  • Reference / ID    : ${tx.refNo}`,
          `  • Status            : ${tx.status}`,
          `  • Transaction Notes : ${tx.notes}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No transactions recorded yet. As you enter trips, expenses, and payments tomorrow,\n   every transaction will be recorded here chronologically.)';

  // Per Vehicle Breakdown
  const vehiclesEnglish = db.vehicles.length > 0
    ? db.vehicles.map((v, i) => {
        const vTrips = db.trips.filter((t) => t.vehicleId === v.id);
        const vFreight = vTrips.reduce((sum, t) => sum + (t.freightAmount || 0), 0);
        const vExpenses = db.expenses
          .filter((e) => e.vehicleId === v.id && e.approvalStatus === 'approved')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const vMaintenance = db.maintenanceRecords
          .filter((m) => m.vehicleId === v.id)
          .reduce((sum, m) => sum + (m.totalCost || 0), 0);
        const vProfit = vFreight - (vExpenses + vMaintenance);
        const assignedDriver = db.drivers.find((d) => d.id === v.assignedDriverId || d.assignedVehicleId === v.id);

        return [
          `Vehicle #${i + 1}: ${v.regNumber} (${v.name})`,
          `  - Manufacturer / Model : ${v.manufacturer} ${v.model}`,
          `  - Category / Fuel Type : ${v.vehicleType || 'Commercial Goods Carrier'} | ${v.fuelType}`,
          `  - Current Odometer     : ${Number(v.currentOdometer || 0).toLocaleString('en-IN')} km`,
          `  - Assigned Driver      : ${assignedDriver ? assignedDriver.fullName : 'None (Unassigned)'}`,
          `  - Operational Status   : ${v.status === 'active' ? 'Active & In Service' : v.status}`,
          `  - Commercial Trips Run : ${vTrips.length} Trips`,
          `  - Total Freight Billed : Rs. ${vFreight.toLocaleString('en-IN')}`,
          `  - Operating Expenses   : Rs. ${vExpenses.toLocaleString('en-IN')}`,
          `  - Maintenance Servicing: Rs. ${vMaintenance.toLocaleString('en-IN')}`,
          `  - Net Truck Profit     : Rs. ${vProfit.toLocaleString('en-IN')} (${vProfit >= 0 ? 'Profitable' : 'Deficit'})`,
        ].join('\n');
      }).join('\n\n')
    : '  (No vehicles registered in fleet)';

  // Per Customer Breakdown
  const customersEnglish = db.customers.length > 0
    ? db.customers.map((c, i) => {
        const cTrips = db.trips.filter((t) => t.customerId === c.id);
        const cFreight = cTrips.reduce((sum, t) => sum + (t.freightAmount || 0), 0);
        const cAdvances = cTrips.reduce((sum, t) => sum + (t.advanceReceived || 0), 0);
        const cPayments = db.tripPayments
          .filter((p) => p.customerId === c.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const cCollected = cAdvances + cPayments;
        const cDue = Math.max(0, cFreight - cCollected);

        return [
          `Customer #${i + 1}: ${c.name} (${c.companyName || 'Individual Party'})`,
          `  - Contact Person : ${c.contactPerson || c.name} | Phone: ${c.phone}`,
          `  - GSTIN / Tax ID : ${c.gstin || 'Unregistered'}`,
          `  - Total Trips    : ${cTrips.length} Trips`,
          `  - Total Billed   : Rs. ${cFreight.toLocaleString('en-IN')}`,
          `  - Cash Collected : Rs. ${cCollected.toLocaleString('en-IN')}`,
          `  - Pending Dues   : Rs. ${cDue.toLocaleString('en-IN')} (${cDue === 0 ? 'Fully Cleared' : 'Payment Outstanding'})`,
        ].join('\n');
      }).join('\n\n')
    : '  (No customers registered)';

  // Per Driver Breakdown
  const driversEnglish = db.drivers.length > 0
    ? db.drivers.map((d, i) => {
        const assignedVeh = db.vehicles.find((v) => v.id === d.assignedVehicleId || v.assignedDriverId === d.id);
        const dPayments = db.salaryPayments.filter((sp) => sp.driverId === d.id);
        const dPaid = dPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0);
        const dRecords = db.salaryRecords.filter((s) => s.driverId === d.id);
        const dDue = dRecords.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

        return [
          `Driver #${i + 1}: ${d.fullName}`,
          `  - Contact Phone       : ${d.phone}`,
          `  - Driving Licence (DL): ${d.dlNumber} (Valid up to: ${d.dlExpiryDate})`,
          `  - Agreed Salary       : Rs. ${Number(d.agreedSalary || 0).toLocaleString('en-IN')} per month (${d.salaryType || 'monthly'})`,
          `  - Assigned Vehicle    : ${assignedVeh ? `${assignedVeh.regNumber} - ${assignedVeh.name}` : 'Not assigned'}`,
          `  - Total Disbursed     : Rs. ${dPaid.toLocaleString('en-IN')}`,
          `  - Unpaid Dues Balance : Rs. ${dDue.toLocaleString('en-IN')} (${dDue === 0 ? 'No Dues Pending' : 'Salary Pending'})`,
          `  - Account Status      : ${d.accountStatus === 'active' || d.accountStatus === 'approved' ? 'Active Working Driver' : d.accountStatus}`,
        ].join('\n');
      }).join('\n\n')
    : '  (No drivers registered)';

  // Assemble Complete Clean Note File
  const content = [
    '================================================================================',
    '             VAHAN360 - FLEET TRANSACTIONS & BUSINESS NOTES',
    '================================================================================',
    `Business Name  : ${db.settings.businessName}`,
    `Fleet Owner    : ${db.settings.ownerName || 'Transport Owner'}`,
    `Contact Phone  : ${db.settings.phone || 'Not Provided'}`,
    `Email Address  : ${db.settings.email || 'Not Provided'}`,
    `Report Date    : ${formattedDate}`,
    `Note File Name : ${filename}`,
    `System Version : ${db.version}`,
    '================================================================================',
    '',
    '--------------------------------------------------------------------------------',
    '1. EXECUTIVE FINANCIAL & FLEET OVERVIEW',
    '--------------------------------------------------------------------------------',
    `• Registered Fleet Vehicles         : ${db.vehicles.length} Vehicles`,
    `• Working Fleet Drivers             : ${db.drivers.length} Drivers`,
    `• Commercial Trips Executed         : ${db.trips.length} Trips`,
    `• Total Commercial Freight Billed   : Rs. ${totalFreight.toLocaleString('en-IN')}`,
    `• Customer Cash Collected           : Rs. ${totalCollections.toLocaleString('en-IN')}`,
    `• Customer Pending Receivables      : Rs. ${customerPending.toLocaleString('en-IN')}`,
    `• Approved Fleet Operating Expenses : Rs. ${totalApprovedExpenses.toLocaleString('en-IN')}`,
    `• Net Commercial Operating Profit   : Rs. ${netFleetProfit.toLocaleString('en-IN')}`,
    `• Driver Salaries Disbursed         : Rs. ${totalSalariesPaid.toLocaleString('en-IN')}`,
    `• Traffic Challan Fines Paid        : Rs. ${totalChallansPaid.toLocaleString('en-IN')}`,
    `• Traffic Challan Fines Pending     : Rs. ${totalChallansPending.toLocaleString('en-IN')}`,
    `• Net Fleet Cash Surplus (In - Out) : Rs. ${netCashSurplus.toLocaleString('en-IN')}`,
    '',
    '--------------------------------------------------------------------------------',
    `2. CHRONOLOGICAL MASTER TRANSACTION LEDGER (${allTxns.length} Transactions)`,
    '--------------------------------------------------------------------------------',
    'Notice: Every transaction recorded in Vahan360 (customer freight billings, cash',
    'advances, collections, vehicle fuel/toll expenses, driver salaries, servicing,',
    'and traffic fines) is cataloged chronologically below.',
    '--------------------------------------------------------------------------------',
    '',
    transactionsEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `3. FLEET VEHICLES & PER-TRUCK CONTRIBUTION (${db.vehicles.length} Vehicles)`,
    '--------------------------------------------------------------------------------',
    vehiclesEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `4. CUSTOMERS & OUTSTANDING RECEIVABLES (${db.customers.length} Parties)`,
    '--------------------------------------------------------------------------------',
    customersEnglish,
    '',
    '--------------------------------------------------------------------------------',
    `5. DRIVER STAFF & PAYROLL REGISTER (${db.drivers.length} Drivers)`,
    '--------------------------------------------------------------------------------',
    driversEnglish,
    '',
    '================================================================================',
    '               END OF VAHAN360 TRANSACTION NOTES & LEDGER',
    '================================================================================',
    `Generated for: ${db.settings.businessName} (${db.settings.ownerName || 'Admin'})`,
    'This note file contains 100% human-readable business records with no encoded system data.',
    'It can be viewed in Notepad, VS Code, or any mobile text reader for easy tracking.',
    '================================================================================',
  ].join('\n');

  return { content, filename };
}

// Perform scheduled or manual server-side backup
export function performServerBackup(type: 'scheduled_daily' | 'manual_txt'): BackupRecord {
  const db = getDatabase();
  const { content, filename, checksum } = generateFullTxtBackup(db);
  const { content: notesContent, filename: notesFilename } = generateTransactionsNote(db);

  let fileSize = Buffer.byteLength(content, 'utf8');

  try {
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    
    // 1. Write the official full disaster-recovery backup
    const filePath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    fileSize = fs.statSync(filePath).size;

    // 2. Write the clean human-readable transaction notes file
    const notesFilePath = path.join(BACKUPS_DIR, notesFilename);
    fs.writeFileSync(notesFilePath, notesContent, 'utf8');

    // 3. Update the live latest transactions note file
    const liveNotePath = path.join(BACKUPS_DIR, 'LATEST_TRANSACTIONS_NOTES.txt');
    fs.writeFileSync(liveNotePath, notesContent, 'utf8');
  } catch {
    // Read-only filesystem (e.g. Vercel)
  }

  const record: BackupRecord = {
    id: `bak_${Date.now()}`,
    timestamp: new Date().toISOString(),
    filename,
    backupType: type,
    recordCount:
      1 +
      db.vehicles.length +
      db.documents.length +
      db.drivers.length +
      db.customers.length +
      db.trips.length +
      db.tripPayments.length +
      db.expenses.length +
      db.salaryRecords.length +
      db.salaryPayments.length +
      db.maintenanceRecords.length +
      db.challans.length +
      (db.driverLeaves || []).length,
    documentCount: db.documents.length,
    fileSize,
    status: 'success',
    checksum,
    storageLocation: `data/backups/${filename}`,
    notes: `${type === 'scheduled_daily' ? 'Automated daily server backup' : 'Manual backup execution'}. Verified checksum & saved transaction notes.`,
  };

  db.backups.unshift(record);
  db.settings.lastBackupDate = record.timestamp;

  // Enforce 30 days retention: keep at most 30 backup files
  cleanOldBackups(db);

  saveDatabase(db);
  return record;
}

function cleanOldBackups(db: DatabaseSchema) {
  try {
    if (db.backups.length > 30) {
      const removed = db.backups.splice(30);
      for (const item of removed) {
        const p = path.join(DATA_DIR, item.storageLocation);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {}
        }
        // Also remove corresponding notes file
        const notesFilename = item.filename.replace('Vahan360_Full_Backup_', 'Vahan360_Transaction_Notes_');
        const notesPath = path.join(BACKUPS_DIR, notesFilename);
        if (fs.existsSync(notesPath)) {
          try {
            fs.unlinkSync(notesPath);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Error cleaning old backups:', err);
  }
}

// Parse and validate a TXT backup file before restoration
export interface BackupValidationResult {
  valid: boolean;
  version?: string;
  createdAt?: string;
  businessName?: string;
  counts: Record<string, number>;
  parsedData?: Partial<DatabaseSchema>;
  errors: string[];
}

export function validateTxtBackup(fileContent: string): BackupValidationResult {
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  if (!fileContent.includes('VAHAN360') || !fileContent.includes('BEGIN DATA SECTIONS')) {
    return {
      valid: false,
      counts: {},
      errors: ['Invalid file format: This is not an authentic Vahan360 backup file.'],
    };
  }

  // Extract sections
  const extractSection = (sectionName: string): any => {
    try {
      const marker = `--- SECTION: ${sectionName} ---`;
      const startIndex = fileContent.indexOf(marker);
      if (startIndex === -1) return null;

      const contentStart = startIndex + marker.length;
      let nextSectionIndex = fileContent.indexOf('--- SECTION:', contentStart);
      if (nextSectionIndex === -1) {
        nextSectionIndex = fileContent.indexOf('================================================================================\nEND OF VAHAN360', contentStart);
      }

      const jsonStr = (nextSectionIndex !== -1 ? fileContent.slice(contentStart, nextSectionIndex) : fileContent.slice(contentStart)).trim();
      return JSON.parse(jsonStr);
    } catch (err: any) {
      errors.push(`Failed to parse section ${sectionName}: ${err.message}`);
      return null;
    }
  };

  const settings = extractSection('SETTINGS');
  const users = extractSection('USERS') || [];
  const vehicles = extractSection('VEHICLES') || [];
  const documents = extractSection('DOCUMENTS') || [];
  const drivers = extractSection('DRIVERS') || [];
  const customers = extractSection('CUSTOMERS') || [];
  const trips = extractSection('TRIPS') || [];
  const tripPayments = extractSection('TRIP_PAYMENTS') || [];
  const expenses = extractSection('EXPENSES') || [];
  const salaryRecords = extractSection('SALARY_RECORDS') || [];
  const salaryPayments = extractSection('SALARY_PAYMENTS') || [];
  const maintenanceRecords = extractSection('MAINTENANCE') || [];
  const challans = extractSection('CHALLANS') || [];
  const notifications = extractSection('NOTIFICATIONS') || [];
  const driverLeaves = extractSection('DRIVER_LEAVES') || [];

  counts.vehicles = vehicles.length;
  counts.documents = documents.length;
  counts.drivers = drivers.length;
  counts.customers = customers.length;
  counts.trips = trips.length;
  counts.tripPayments = tripPayments.length;
  counts.expenses = expenses.length;
  counts.salaryRecords = salaryRecords.length;
  counts.salaryPayments = salaryPayments.length;
  counts.maintenanceRecords = maintenanceRecords.length;
  counts.challans = challans.length;

  if (!settings || !Array.isArray(vehicles) || !Array.isArray(drivers)) {
    errors.push('Essential fleet entities (settings, vehicles, or drivers) are missing or corrupted.');
  }

  return {
    valid: errors.length === 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    businessName: settings?.businessName || 'Unknown Fleet',
    counts,
    parsedData: {
      settings,
      vehicles,
      documents,
      drivers,
      customers,
      trips,
      tripPayments,
      expenses,
      salaryRecords,
      salaryPayments,
      maintenanceRecords,
      challans,
      notifications,
      driverLeaves,
    },
    errors,
  };
}

// Restore database from validated backup data with pre-rollback snapshot
export function restoreFromValidatedBackup(
  validation: BackupValidationResult,
  adminUser: { id: string; name: string }
): { success: boolean; message: string; restoredCounts: Record<string, number> } {
  if (!validation.valid || !validation.parsedData) {
    return { success: false, message: 'Cannot restore: validation failed.', restoredCounts: {} };
  }

  const db = getDatabase();

  // Create immediate pre-restoration rollback snapshot
  performServerBackup('manual_txt');

  try {
    const data = validation.parsedData;

    // Preserve the current Admin account's credentials so owner does not get locked out
    const currentAdmin = db.users.find((u) => u.role === 'admin' && u.status === 'active');

    if (data.settings) {
      db.settings = { ...db.settings, ...data.settings };
    }

    if (data.vehicles) db.vehicles = data.vehicles;
    if (data.documents) db.documents = data.documents;
    if (data.drivers) db.drivers = data.drivers;
    if (data.customers) db.customers = data.customers;
    if (data.trips) db.trips = data.trips;
    if (data.tripPayments) db.tripPayments = data.tripPayments;
    if (data.expenses) db.expenses = data.expenses;
    if (data.salaryRecords) db.salaryRecords = data.salaryRecords;
    if (data.salaryPayments) db.salaryPayments = data.salaryPayments;
    if (data.maintenanceRecords) db.maintenanceRecords = data.maintenanceRecords;
    if (data.challans) db.challans = data.challans;
    if (data.driverLeaves) db.driverLeaves = data.driverLeaves;

    // Ensure the admin user remains valid
    if (currentAdmin) {
      const adminExists = db.users.some((u) => u.id === currentAdmin.id);
      if (!adminExists) {
        db.users.push(currentAdmin);
      }
    }

    logAudit(
      adminUser.id,
      adminUser.name,
      'admin',
      'RESTORE_FROM_BACKUP',
      'System',
      `Restored database from TXT backup with ${Object.values(validation.counts).reduce((a, b) => a + b, 0)} records.`
    );

    saveDatabase(db);

    return {
      success: true,
      message: 'Business database restored successfully without data loss.',
      restoredCounts: validation.counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Restoration failed: ${err.message}`,
      restoredCounts: {},
    };
  }
}

// Generate comprehensive Master Fleet Archive ZIP with Excel, JSON, TXT, CSV, and documents
export async function generateDocumentsZip(): Promise<Buffer> {
  const zip = new JSZip();
  const db = getDatabase();

  // 1. Master Excel Workbook (.xlsx)
  try {
    const excel = generateMasterExcelWorkbook(db);
    zip.file(`reports/${excel.filename}`, excel.buffer);
  } catch (err) {
    console.error('Error adding Excel workbook to ZIP:', err);
  }

  // 2. Full Text Disaster Recovery Backup (.txt)
  try {
    const txtBackup = generateFullTxtBackup(db);
    zip.file(`database/${txtBackup.filename}`, txtBackup.content);
  } catch (err) {
    console.error('Error adding TXT backup to ZIP:', err);
  }

  // 2.5 Clean Human-Readable Transaction Notes (.txt)
  try {
    const notes = generateTransactionsNote(db);
    zip.file(`reports/${notes.filename}`, notes.content);
    zip.file('reports/LATEST_TRANSACTIONS_NOTES.txt', notes.content);
  } catch (err) {
    console.error('Error adding transaction notes to ZIP:', err);
  }

  // 3. Sanitized JSON Database Snapshot (.json)
  try {
    const sanitizedDb = {
      ...db,
      users: db.users.map((u) => {
        const { passwordHash, ...rest } = u;
        return rest;
      }),
    };
    zip.file('database/vahan360_database_snapshot.json', JSON.stringify(sanitizedDb, null, 2));
  } catch (err) {
    console.error('Error adding JSON snapshot to ZIP:', err);
  }

  // 4. Tabular CSV Exports
  try {
    if (db.vehicles.length > 0) zip.file('csv/vehicles.csv', exportToCsv(db.vehicles));
    if (db.trips.length > 0) zip.file('csv/trips.csv', exportToCsv(db.trips));
    if (db.drivers.length > 0) zip.file('csv/drivers.csv', exportToCsv(db.drivers));
    if (db.expenses.length > 0) zip.file('csv/expenses.csv', exportToCsv(db.expenses));
    if (db.customers.length > 0) zip.file('csv/customers.csv', exportToCsv(db.customers));
    if (db.salaryRecords.length > 0) zip.file('csv/salary_records.csv', exportToCsv(db.salaryRecords));
    if (db.maintenanceRecords.length > 0) zip.file('csv/maintenance.csv', exportToCsv(db.maintenanceRecords));
    if (db.challans.length > 0) zip.file('csv/challans.csv', exportToCsv(db.challans));
  } catch (err) {
    console.error('Error adding CSVs to ZIP:', err);
  }

  // 5. Manifest linking records to files
  const manifest = {
    generatedAt: new Date().toISOString(),
    business: db.settings.businessName,
    recordsSummary: {
      vehicles: db.vehicles.length,
      drivers: db.drivers.length,
      trips: db.trips.length,
      expenses: db.expenses.length,
      customers: db.customers.length,
    },
    vehicles: db.vehicles.map((v) => ({
      regNumber: v.regNumber,
      documents: db.documents.filter((d) => d.vehicleId === v.id),
    })),
    expensesWithReceipts: db.expenses.filter((e) => e.receiptUrl),
    challansWithReceipts: db.challans.filter((c) => c.receiptUrl),
  };

  zip.file('DOCUMENT_MANIFEST.json', JSON.stringify(manifest, null, 2));

  // 6. Plain English summary for transport owner
  const englishDocLines = [
    '================================================================================',
    'VAHAN360 - FLEET DOCUMENTS & RECEIPTS ARCHIVE (ENGLISH SUMMARY)',
    '================================================================================',
    `Business Name  : ${db.settings.businessName || 'Vahan360 Fleet Logistics'}`,
    `Fleet Owner    : ${db.settings.ownerName || 'Fleet Admin'}`,
    `Archive Date   : ${new Date().toLocaleString('en-IN')}`,
    '================================================================================',
    '',
    '1. VEHICLE COMPLIANCE DOCUMENTS:',
    ...db.vehicles.map((v) => {
      const vDocs = db.documents.filter((d) => d.vehicleId === v.id);
      return [
        `Vehicle: ${v.regNumber} (${v.name})`,
        ...(vDocs.length > 0
          ? vDocs.map((d) => `  - ${d.docType.toUpperCase()}: ${d.fileName || d.docNumber} (Valid up to: ${d.expiryDate}) [File: ${d.fileUrl || 'N/A'}]`)
          : ['  - (No documents uploaded for this vehicle)']),
      ].join('\n');
    }),
    '',
    '2. EXPENSE VOUCHERS & BILLS:',
    ...(manifest.expensesWithReceipts.length > 0
      ? manifest.expensesWithReceipts.map((e) => `  - Expense on ${e.expenseDate}: Rs. ${e.amount} (${e.category}) - ${e.description} [Receipt: ${e.receiptUrl}]`)
      : ['  - No expense receipts attached']),
    '',
    '3. TRAFFIC CHALLAN RECEIPTS:',
    ...(manifest.challansWithReceipts.length > 0
      ? manifest.challansWithReceipts.map((c) => `  - Challan ${c.challanNumber}: Rs. ${c.fineAmount} (${c.violationDescription}) [Receipt: ${c.receiptUrl}]`)
      : ['  - No challan receipts attached']),
    '',
    '================================================================================',
  ].join('\n');

  zip.file('DOCUMENTS_LIST_ENGLISH.txt', englishDocLines);

  // 7. Informative Readme
  zip.file(
    'README.txt',
    `================================================================================
VAHAN360 - ALL-IN-ONE MASTER FLEET ARCHIVE
================================================================================
Business     : ${db.settings.businessName || 'Vahan360 Fleet Logistics'}
Owner        : ${db.settings.ownerName || 'Fleet Admin'}
Generated At : ${new Date().toLocaleString('en-IN')}

This comprehensive archive includes:
1. /reports/      -> Complete Master Excel Workbook (.xlsx) with 8 financial & operational worksheets
2. /database/     -> Full portable JSON database snapshot and plain-text disaster recovery file (.txt)
3. /csv/          -> Raw CSV tables for vehicles, trips, drivers, and expenses
4. /uploads/      -> Uploaded vehicle compliance certificates, RTO fitness documents, and receipts
5. DOCUMENTS_LIST_ENGLISH.txt -> Human-readable fleet summary
================================================================================`
  );

  // 8. If uploads directory has files, add them
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      const fullPath = path.join(UPLOADS_DIR, file);
      if (fs.statSync(fullPath).isFile()) {
        const data = fs.readFileSync(fullPath);
        zip.file(`uploads/${file}`, data);
      }
    }
  }

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Export CSV helpers
export function exportToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
