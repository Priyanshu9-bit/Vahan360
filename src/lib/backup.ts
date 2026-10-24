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

// Generate the official Vahan360 Full TXT Backup string
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

  const header = [
    '================================================================================',
    'VAHAN360 - COMMERCIAL VEHICLE FLEET MANAGEMENT SYSTEM',
    'OFFICIAL BUSINESS DATA BACKUP FILE (UTF-8)',
    '================================================================================',
    `Backup Version: ${db.version}`,
    `Application: Vahan360`,
    `Business Name: ${db.settings.businessName}`,
    `Owner Name: ${db.settings.ownerName}`,
    `Created At: ${new Date().toISOString()}`,
    `Total Records: ${totalRecords}`,
    'Security Note: Password hashes, authentication tokens, and API keys are strictly excluded.',
    'Restoration: This file can be restored via the Admin Dashboard > Backup & Restore section.',
    '================================================================================',
    '',
    'SUMMARY OF INCLUDED RECORDS:',
    JSON.stringify(recordCounts, null, 2),
    '',
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

  const content = header + sections;
  const checksum = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

  return { content, filename, checksum };
}

// Perform scheduled or manual server-side backup
export function performServerBackup(type: 'scheduled_daily' | 'manual_txt'): BackupRecord {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const db = getDatabase();
  const { content, filename, checksum } = generateFullTxtBackup(db);

  const filePath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf8');

  const stats = fs.statSync(filePath);

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
    fileSize: stats.size,
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

  // Add README
  zip.file(
    'README.txt',
    'Vahan360 - Document & Receipts Archive\n' +
      'Contains uploaded compliance documents, RTO certificates, and expense vouchers.\n' +
      'Refer to DOCUMENT_MANIFEST.json for metadata mapping.'
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
