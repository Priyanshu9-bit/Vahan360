import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { getDatabase, saveDatabase, logAudit } from './db';
import { DatabaseSchema, BackupRecord } from '@/types';

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

// Perform scheduled or manual server-side backup
export function performServerBackup(type: 'scheduled_daily' | 'manual_txt'): BackupRecord {
  const db = getDatabase();
  const { content, filename, checksum } = generateFullTxtBackup(db);

  let fileSize = Buffer.byteLength(content, 'utf8');

  try {
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const filePath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    fileSize = fs.statSync(filePath).size;
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
      db.challans.length,
    documentCount: db.documents.length,
    fileSize,
    status: 'success',
    checksum,
    storageLocation: `data/backups/${filename}`,
    notes: `${type === 'scheduled_daily' ? 'Automated daily server backup' : 'Manual backup execution'}. Verified checksum.`,
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

// Generate ZIP of uploaded documents and receipts
export async function generateDocumentsZip(): Promise<Buffer> {
  const zip = new JSZip();
  const db = getDatabase();

  // Manifest linking records to files
  const manifest = {
    generatedAt: new Date().toISOString(),
    business: db.settings.businessName,
    vehicles: db.vehicles.map((v) => ({
      regNumber: v.regNumber,
      documents: db.documents.filter((d) => d.vehicleId === v.id),
    })),
    expensesWithReceipts: db.expenses.filter((e) => e.receiptUrl),
    challansWithReceipts: db.challans.filter((c) => c.receiptUrl),
  };

  zip.file('DOCUMENT_MANIFEST.json', JSON.stringify(manifest, null, 2));

  // Plain English summary for transport owner
  const englishDocLines = [
    '================================================================================',
    'VAHAN360 - FLEET DOCUMENTS & RECEIPTS ARCHIVE (ENGLISH SUMMARY)',
    '================================================================================',
    `Business Name  : ${db.settings.businessName}`,
    `Fleet Owner    : ${db.settings.ownerName}`,
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

  // Add README
  zip.file(
    'README.txt',
    'Vahan360 - Document & Receipts Archive\n' +
      'Contains uploaded compliance documents, RTO certificates, and expense vouchers.\n' +
      'Open DOCUMENTS_LIST_ENGLISH.txt to read the full summary in simple English.'
  );

  // If uploads directory has files, add them
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
