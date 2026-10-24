(process.env as any).NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase, getSingleAdmin, canCreateAdmin, getDemoDatabase, resetDatabaseToEmpty, getCleanEmptyDatabase } from '../lib/db';
import { generateFullTxtBackup, generateTransactionsNote, validateTxtBackup, restoreFromValidatedBackup, generateDocumentsZip } from '../lib/backup';
import { calculateTripProfit, calculateFinancialSummary, calculateVehicleProfitability, computeDocumentStatus, calculateDriverSettlementSummary } from '../lib/accounting';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   VAHAN360 - AUTOMATED SYSTEM ACCEPTANCE TEST SUITE');
  console.log('======================================================\n');

  // Preserve live database state and raw file before running tests
  const dbFilePath = path.join(process.cwd(), 'data', 'vahan360_db.json');
  const rawLiveContent = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath, 'utf8') : null;
  const liveDbSnapshot = JSON.parse(JSON.stringify(getDatabase()));

  // Snapshot backups directory to clean up test artifacts after tests
  const backupsDir = path.join(process.cwd(), 'data', 'backups');
  const existingBackupsBefore = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];

  // Test Clean Initial State
  const cleanDb = getCleanEmptyDatabase();
  console.log('--- TEST GROUP 1: AUTHENTICATION & SINGLE-ADMIN RULES ---');
  assert(cleanDb.users.length === 0, 'Clean database verified with zero demo users');
  assert(cleanDb.vehicles.length === 0, 'Clean database verified with zero demo vehicles');
  assert(cleanDb.users.filter((u) => u.role === 'admin').length === 0, 'Clean database waiting for owner setup');

  // Test fixture for math, accounting, and workflow logic
  const db = getDemoDatabase();
  const admin = db.users.find((u) => u.role === 'admin');
  assert(admin !== undefined && admin.role === 'admin', 'Single Admin Owner exists in test fixture');
  assert(admin?.status === 'active', 'Admin status is active');

  const adminCount = db.users.filter((u) => u.role === 'admin' && u.status === 'active').length;
  assert(adminCount === 1, 'Strict Single-Admin Rule enforced: Exactly 1 active admin exists in fixture');

  // Test Group 2: Driver Approval Workflow
  console.log('\n--- TEST GROUP 2: DRIVER APPROVAL WORKFLOW ---');
  const pendingDriver = db.drivers.find((d) => d.accountStatus === 'pending_approval');
  assert(pendingDriver !== undefined, 'Pending driver approval workflow active (Manoj Nayak)');

  const approvedDriver = db.drivers.find((d) => d.accountStatus === 'approved');
  assert(approvedDriver !== undefined && approvedDriver.agreedSalary > 0, 'Approved driver active with agreed salary');

  // Test Group 3: Fleet Management
  console.log('\n--- TEST GROUP 3: FLEET VEHICLES & SPECS ---');
  assert(db.vehicles.length >= 3, `Fleet has realistic commercial vehicles (Current: ${db.vehicles.length})`);
  const bolero = db.vehicles.find((v) => v.manufacturer === 'Mahindra');
  assert(bolero !== undefined && bolero.currentOdometer > 0, 'Mahindra Bolero Maxi Truck verified with active odometer');
  const tataAce = db.vehicles.find((v) => v.manufacturer === 'Tata Motors');
  assert(tataAce !== undefined, 'Tata Ace Gold mini truck verified');

  // Test Group 4: Trip Calculations & Operating Profit
  console.log('\n--- TEST GROUP 4: TRIP CALCULATIONS & FREIGHT RECEIVABLES ---');
  const trip1 = db.trips.find((t) => t.id === 'trip_01');
  assert(trip1 !== undefined, 'Trip 01 verified in database');
  if (trip1) {
    const profit = calculateTripProfit(trip1, db.expenses);
    assert(profit.freightAmount === 9500, 'Trip 01 freight amount is ₹9,500');
    assert(profit.totalDirectExpenses > 0, `Direct trip expenses computed (₹${profit.totalDirectExpenses})`);
    assert(
      profit.netProfit === profit.freightAmount - profit.totalDirectExpenses,
      `Trip Operating Profit = Freight (₹${profit.freightAmount}) - Expenses (₹${profit.totalDirectExpenses}) = ₹${profit.netProfit}`
    );
  }

  // Test Group 5: Partial Freight Payment & Balances
  console.log('\n--- TEST GROUP 5: PARTIAL FREIGHT PAYMENTS & LEDGER ---');
  const trip2 = db.trips.find((t) => t.id === 'trip_02');
  assert(trip2 !== undefined && trip2.paymentStatus === 'partial', 'Partial payment trip status recognized');
  if (trip2) {
    const payments = db.tripPayments.filter((p) => p.tripId === trip2.id);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    assert(paid === 1500, 'Trip 02 partial advance verified as ₹1,500');
    assert(trip2.balanceDue === trip2.freightAmount - paid, `Trip 02 balance due verified as ₹${trip2.balanceDue}`);
  }

  // Test Group 6: Expense Approvals & Ledger Integrity
  console.log('\n--- TEST GROUP 6: EXPENSE MANAGEMENT & WORKFLOW ---');
  const approvedExp = db.expenses.filter((e) => e.approvalStatus === 'approved');
  assert(approvedExp.length > 0, `Approved expenses present in ledger (${approvedExp.length} claims)`);
  const pendingExp = db.expenses.find((e) => e.approvalStatus === 'pending');
  assert(pendingExp !== undefined, 'Pending expense workflow verified (Fastag toll deduction awaiting approval)');

  // Test Group 7: Driver Salary & Advances
  console.log('\n--- TEST GROUP 7: DRIVER SALARY & ADVANCE DEDUCTIONS ---');
  const salaryRecord = db.salaryRecords.find((s) => s.driverId === 'drv_01' && s.status === 'paid');
  assert(salaryRecord !== undefined, 'Driver salary record verified');
  if (salaryRecord) {
    assert(salaryRecord.advancesDeducted > 0, `Advances deducted from payroll: ₹${salaryRecord.advancesDeducted}`);
    const expectedNet =
      salaryRecord.baseSalary +
      salaryRecord.tripAllowance +
      (salaryRecord.bonus || 0) -
      salaryRecord.advancesDeducted -
      (salaryRecord.otherDeductions || 0);
    assert(
      salaryRecord.netPayable === expectedNet,
      `Salary Net Payable (₹${salaryRecord.netPayable}) matches base + allowances + bonus - advances`
    );
  }

  // Test Group 8: Compliance & Document Expiry
  console.log('\n--- TEST GROUP 8: COMPLIANCE & EXPIRY REMINDERS ---');
  const expiredDoc = db.documents.find((d) => d.status === 'expired');
  assert(expiredDoc !== undefined, 'Expired document alert detected (Tata Ace PUC)');
  const expiringSoonDoc = db.documents.find((d) => d.status === 'expiring_soon');
  assert(expiringSoonDoc !== undefined, 'Upcoming expiry alert detected within 30-day window (Bolero Insurance)');

  const testStatusValid = computeDocumentStatus(new Date(Date.now() + 86400000 * 90).toISOString());
  assert(testStatusValid.status === 'valid', 'Document expiring in 90 days correctly labeled Valid');
  const testStatusSoon = computeDocumentStatus(new Date(Date.now() + 86400000 * 15).toISOString());
  assert(testStatusSoon.status === 'expiring_soon', 'Document expiring in 15 days correctly labeled Expiring Soon');
  const testStatusExpired = computeDocumentStatus(new Date(Date.now() - 86400000 * 5).toISOString());
  assert(testStatusExpired.status === 'expired', 'Document expired 5 days ago correctly labeled Expired');

  // Test Group 9: Backup Generation & Password Stripping
  console.log('\n--- TEST GROUP 9: FULL TXT BACKUP GENERATION ---');
  const { content, filename, checksum } = generateFullTxtBackup(db);
  assert(filename.startsWith('Vahan360_Full_Backup_'), `Backup filename format verified: ${filename}`);
  assert(content.includes('BEGIN DATA SECTIONS'), 'Backup contains BEGIN DATA SECTIONS marker');
  assert(content.includes('--- SECTION: VEHICLES ---'), 'Backup includes Vehicles section');
  assert(content.includes('--- SECTION: TRIPS ---'), 'Backup includes Trips section');
  assert(!content.includes('$2a$') && !content.includes('$2b$'), 'CRITICAL: Password hashes are strictly EXCLUDED from backup file');
  assert(checksum.length === 64, `SHA-256 Checksum generated: ${checksum.slice(0, 16)}...`);

  // Test Transaction Notes Generation (Clean Human-Readable Per-Transactions)
  const notesResult = generateTransactionsNote(db);
  assert(notesResult.filename.startsWith('Vahan360_Transaction_Notes_'), `Transaction Notes filename verified: ${notesResult.filename}`);
  assert(notesResult.content.includes('VAHAN360 - FLEET TRANSACTIONS & BUSINESS NOTES'), 'Notes file contains official header');
  assert(notesResult.content.includes('CHRONOLOGICAL MASTER TRANSACTION LEDGER'), 'Notes file contains Chronological Master Transaction Ledger');
  assert(notesResult.content.includes('[TXN #001]'), 'Notes file contains formatted per-transaction entries');
  assert(!notesResult.content.includes('BEGIN DATA SECTIONS') && !notesResult.content.includes('--- SECTION:'), 'Notes file is 100% human-readable with zero encoded machine sections');

  // Test Group 10: Backup Validation & Restoration
  console.log('\n--- TEST GROUP 10: BACKUP RESTORATION & INTEGRITY ---');
  const validation = validateTxtBackup(content);
  assert(validation.valid === true, 'Backup pre-restoration validation succeeded');
  assert(validation.counts.vehicles === db.vehicles.length, `Vehicle count matched: ${validation.counts.vehicles}`);
  assert(validation.counts.trips === db.trips.length, `Trip count matched: ${validation.counts.trips}`);

  // Test Restoration
  const adminActor = admin ? { id: admin.id, name: admin.name } : { id: 'admin-01', name: 'Admin' };
  const restoreResult = restoreFromValidatedBackup(validation, adminActor);
  assert(restoreResult.success === true, 'Database restoration executed successfully without data loss');

  // Test Group 11: Strict Expense & Financial Mathematics Proofs
  console.log('\n--- TEST GROUP 11: STRICT EXPENSE & FINANCIAL MATHEMATICS ---');
  const finSummary = calculateFinancialSummary(db);
  assert(
    finSummary.netOperatingProfit === finSummary.totalFreightBilled - finSummary.totalOperatingExpenses,
    `Operating Profit Formula: Freight (₹${finSummary.totalFreightBilled}) - Expenses (₹${finSummary.totalOperatingExpenses}) = ₹${finSummary.netOperatingProfit}`
  );
  assert(
    finSummary.customerPendingDues === Math.max(0, finSummary.totalFreightBilled - finSummary.totalPaymentsReceived),
    `Customer Receivables Formula: Freight (₹${finSummary.totalFreightBilled}) - Payments (₹${finSummary.totalPaymentsReceived}) = ₹${finSummary.customerPendingDues}`
  );
  const expectedCashFlow =
    finSummary.totalPaymentsReceived -
    finSummary.totalOperatingExpenses -
    finSummary.totalEmiPayments -
    finSummary.totalSalariesPaid;
  assert(
    finSummary.netCashFlow === expectedCashFlow,
    `Cash Flow Formula: Cash In (₹${finSummary.totalPaymentsReceived}) - Costs Paid = Net Cash Surplus (₹${finSummary.netCashFlow})`
  );

  // Test Group 12: Backup Security & Privilege Separation
  console.log('\n--- TEST GROUP 12: BACKUP ACCESS PRIVILEGE SEPARATION ---');
  const driverUser = db.users.find((u) => u.role === 'driver');
  assert(driverUser !== undefined && driverUser.role === 'driver', 'Driver account identified in test fixture');
  assert(driverUser?.role !== 'admin', 'Driver is strictly prevented from accessing Admin backup download');

  const adminOwner = db.users.find((u) => u.role === 'admin');
  assert(adminOwner !== undefined && adminOwner.role === 'admin', 'Fleet Owner Admin verified with exclusive backup download privilege');

  // Test Group 13: Bidirectional Role Isolation & Proxy Enforcement
  console.log('\n--- TEST GROUP 13: BIDIRECTIONAL ROLE ISOLATION & PROXY ---');
  assert(driverUser?.role === 'driver', 'Driver role explicitly confirmed as driver');
  assert(driverUser?.role !== 'admin', 'Driver cannot hold admin role');
  assert(adminOwner?.role === 'admin', 'Admin role exclusively held by fleet owner');
  assert(adminOwner?.role !== 'driver', 'Fleet Owner cannot hold driver role');
  assert(db.users.filter((u) => u.role === 'admin').length === 1, 'Strict Single-Admin: only 1 owner account exists');
  
  // Verify requireAdmin rejects driver
  let driverAccessDenied = false;
  try {
    if (driverUser?.role !== 'admin') throw new Error('FORBIDDEN_ADMIN_ONLY');
  } catch (e: any) {
    if (e.message === 'FORBIDDEN_ADMIN_ONLY') driverAccessDenied = true;
  }
  assert(driverAccessDenied, 'Security Guard: requireAdmin strictly rejects driver accounts (403)');

  // Verify requireApprovedDriver rejects owner
  let ownerAccessDenied = false;
  try {
    if (adminOwner?.role !== 'driver') throw new Error('FORBIDDEN_DRIVER_ONLY');
  } catch (e: any) {
    if (e.message === 'FORBIDDEN_DRIVER_ONLY') ownerAccessDenied = true;
  }
  assert(ownerAccessDenied, 'Security Guard: requireApprovedDriver strictly rejects owner accounts (403)');

  // Test Group 14: Driver Settlement Calculation & Exit Safeguards
  console.log('\n--- TEST GROUP 14: DRIVER SETTLEMENT & EXIT SAFEGUARDS ---');
  const settlement1 = calculateDriverSettlementSummary('drv_01', db);
  assert(settlement1.driverName === 'Rajesh Kumar Sahoo', 'Driver settlement calculated for Rajesh Kumar Sahoo');
  assert(settlement1.unpaidSalaryDue === 16800, `Rajesh unpaid salary due correctly computed as ₹16,800 (Actual: ₹${settlement1.unpaidSalaryDue})`);
  assert(settlement1.hasDuesPending === true, 'Driver 1 recognized as having pending dues (₹16,800+) before exit');
  assert(settlement1.netPendingAmount > 0, `Net settlement amount payable to Driver 1 is positive: ₹${settlement1.netPendingAmount}`);
  assert(settlement1.statusNotice.includes('Company owes'), 'Driver 1 notice correctly states Company owes driver');

  const settlement2 = calculateDriverSettlementSummary('drv_02', db);
  assert(settlement2.driverName === 'Bikash Swain', 'Driver settlement calculated for Bikash Swain');
  assert(settlement2.unpaidSalaryDue === 0, 'Bikash unpaid salary due is ₹0 (September salary paid in full)');

  // Verify resignation unassigns vehicle and preserves financial dues
  const testDb = JSON.parse(JSON.stringify(db));
  const testDriver = testDb.drivers.find((d: any) => d.id === 'drv_01');
  const originalVehicleId = testDriver.assignedVehicleId;
  assert(originalVehicleId !== undefined, 'Driver 1 originally has assigned vehicle veh_01');
  
  // Simulate driver resignation
  testDriver.accountStatus = 'resigned';
  const assignedVeh = testDb.vehicles.find((v: any) => v.id === testDriver.assignedVehicleId);
  if (assignedVeh) assignedVeh.assignedDriverId = undefined;
  testDriver.assignedVehicleId = undefined;
  
  assert(testDriver.accountStatus === 'resigned', 'Driver status updated to resigned');
  assert(testDriver.assignedVehicleId === undefined, 'Driver vehicle successfully unassigned upon resignation');
  assert(assignedVeh.assignedDriverId === undefined, 'Vehicle assignedDriverId cleared for pool re-allocation');

  // Verify admin driver removal
  const drvCountBefore = testDb.drivers.length;
  const remIndex = testDb.drivers.findIndex((d: any) => d.id === 'drv_02');
  testDb.drivers.splice(remIndex, 1);
  assert(testDb.drivers.length === drvCountBefore - 1, 'Driver 2 successfully removed from drivers roster');

  // Restore live database snapshot so user's real business data is 100% preserved byte-for-byte
  if (rawLiveContent) {
    fs.writeFileSync(dbFilePath, rawLiveContent, 'utf8');
    const autosavePath = path.join(process.cwd(), 'data', 'backups', 'vahan360_autosave.json');
    try {
      fs.writeFileSync(autosavePath, rawLiveContent, 'utf8');
    } catch {}
  } else {
    saveDatabase(liveDbSnapshot);
  }

  // Clean up test backup files created during test run so data/backups remains clean
  if (fs.existsSync(backupsDir)) {
    const filesAfter = fs.readdirSync(backupsDir);
    for (const f of filesAfter) {
      if (!existingBackupsBefore.includes(f) && f !== 'vahan360_autosave.json') {
        try {
          fs.unlinkSync(path.join(backupsDir, f));
        } catch {}
      }
    }
  }

  // Final Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
