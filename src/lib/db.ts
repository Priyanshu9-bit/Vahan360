import fs from 'fs';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import {
  DatabaseSchema,
  User,
  BusinessSettings,
  Vehicle,
  VehicleDocument,
  Driver,
  Customer,
  Trip,
  TripPayment,
  Expense,
  DriverSalaryRecord,
  SalaryPayment,
  MaintenanceRecord,
  Challan,
  Notification,
  BackupRecord,
  AuditLog,
} from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vahan360_db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const AUTOSAVE_BACKUP_FILE = path.join(BACKUPS_DIR, 'vahan360_autosave.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Writable fallback directory on Serverless / Vercel
const TMP_DATA_DIR = path.join(os.tmpdir(), 'vahan360_data');
const TMP_DB_FILE = path.join(TMP_DATA_DIR, 'vahan360_db.json');
const TMP_BACKUPS_DIR = path.join(TMP_DATA_DIR, 'backups');
const TMP_UPLOADS_DIR = path.join(TMP_DATA_DIR, 'uploads');

// Ensure necessary directories exist without throwing on read-only serverless filesystems
function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // Read-only filesystem (e.g. Vercel Serverless / AWS Lambda)
    try {
      if (!fs.existsSync(TMP_DATA_DIR)) fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
      if (!fs.existsSync(TMP_BACKUPS_DIR)) fs.mkdirSync(TMP_BACKUPS_DIR, { recursive: true });
      if (!fs.existsSync(TMP_UPLOADS_DIR)) fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
    } catch {}
  }
}

export function getCleanEmptyDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    updatedAt: now,
    settings: {
      id: 'biz_01',
      businessName: 'Vahan360 Fleet Logistics',
      tagline: 'Complete Control of Your Fleet.',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
      autoBackupEnabled: true,
      backupRetentionDays: 30,
      createdAt: now,
      updatedAt: now,
    },
    users: [],
    vehicles: [],
    documents: [],
    drivers: [],
    customers: [],
    trips: [],
    tripPayments: [],
    expenses: [],
    salaryRecords: [],
    salaryPayments: [],
    maintenanceRecords: [],
    challans: [],
    notifications: [],
    backups: [],
    auditLogs: [],
  };
}

export function getInitialDatabase(): DatabaseSchema {
  return getCleanEmptyDatabase();
}

export function resetDatabaseToEmpty(): DatabaseSchema {
  const emptyDb = getCleanEmptyDatabase();
  saveDatabase(emptyDb);
  return emptyDb;
}

export function getDemoDatabase(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultAdminPassword = bcrypt.hashSync('Admin@360', salt);
  const defaultDriverPassword = bcrypt.hashSync('Driver@123', salt);

  const now = new Date().toISOString();

  const settings: BusinessSettings = {
    id: 'biz_01',
    businessName: 'Vahan360 Fleet Logistics',
    tagline: 'Complete Control of Your Fleet.',
    ownerName: 'Sushanta Nayak',
    phone: '+91 99380 75395',
    email: 'sushantan34@gmail.com',
    address: 'Bhubaneswar, Odisha',
    gstin: '21AAACV3600A1Z5',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    language: 'en',
    autoBackupEnabled: true,
    backupRetentionDays: 30,
    lastBackupDate: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: now,
  };

  const users: User[] = [
    {
      id: 'usr_admin',
      name: 'Sushanta Nayak (Owner)',
      email: 'sushantan34@gmail.com',
      phone: '9938075395',
      role: 'admin',
      status: 'active',
      passwordHash: defaultAdminPassword,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'usr_drv1',
      name: 'Rajesh Kumar Sahoo',
      email: 'rajesh.driver@vahan360.com',
      phone: '+91 94371 11223',
      role: 'driver',
      status: 'active',
      passwordHash: defaultDriverPassword,
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'usr_drv2',
      name: 'Bikash Swain',
      email: 'bikash.driver@vahan360.com',
      phone: '+91 94372 33445',
      role: 'driver',
      status: 'active',
      passwordHash: defaultDriverPassword,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'usr_drv3',
      name: 'Manoj Nayak',
      email: 'manoj.driver@vahan360.com',
      phone: '+91 94373 55667',
      role: 'driver',
      status: 'pending_approval',
      passwordHash: defaultDriverPassword,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: now,
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: 'veh_01',
      regNumber: 'OD 02 AK 4589',
      name: 'Bolero Maxi Truck Plus',
      manufacturer: 'Mahindra',
      model: 'Maxi Truck Plus 1.2T',
      vehicleType: 'Pickup Truck',
      regDate: '2023-04-12',
      chassisNumber: 'MA1TA2BK8P3K19283',
      engineNumber: 'M2DICR43981',
      fuelType: 'Diesel',
      currentOdometer: 48650,
      purchaseDate: '2023-04-05',
      purchasePrice: 785000,
      loanDetails: {
        financer: 'Mahindra Finance',
        loanAccountNumber: 'MFIN-2023-90812',
        totalLoanAmount: 550000,
        emiAmount: 14200,
        tenureMonths: 48,
        startDate: '2023-05-10',
      },
      status: 'active',
      assignedDriverId: 'drv_01',
      notes: 'Main cargo workhorse for inter-district deliveries.',
      createdAt: '2023-04-12T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'veh_02',
      regNumber: 'OD 33 J 8820',
      name: 'Tata Ace Gold Diesel',
      manufacturer: 'Tata Motors',
      model: 'Ace Gold 2-Cyl DI 700kg',
      vehicleType: 'Mini Truck',
      regDate: '2024-02-18',
      chassisNumber: 'MAT612048R1D29481',
      engineNumber: 'TATA275IDI9812',
      fuelType: 'Diesel',
      currentOdometer: 26400,
      purchaseDate: '2024-02-10',
      purchasePrice: 620000,
      loanDetails: {
        financer: 'HDFC Bank Auto Loan',
        loanAccountNumber: 'HDFC-CV-449102',
        totalLoanAmount: 450000,
        emiAmount: 11800,
        tenureMonths: 48,
        startDate: '2024-03-05',
      },
      status: 'active',
      assignedDriverId: 'drv_02',
      notes: 'Urban city deliveries, narrow lane navigation.',
      createdAt: '2024-02-18T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'veh_03',
      regNumber: 'OD 05 M 1204',
      name: 'Ashok Leyland Dost Strong',
      manufacturer: 'Ashok Leyland',
      model: 'Dost Strong 1.25T',
      vehicleType: 'LCV Pickup',
      regDate: '2024-09-01',
      chassisNumber: 'MB1D55E6XR9M81234',
      engineNumber: 'ALTD24CR9012',
      fuelType: 'Diesel',
      currentOdometer: 14800,
      purchaseDate: '2024-08-25',
      purchasePrice: 840000,
      status: 'in_service',
      notes: 'Scheduled 15,000 km oil change and brake inspection.',
      createdAt: '2024-09-01T00:00:00.000Z',
      updatedAt: now,
    },
  ];

  const drivers: Driver[] = [
    {
      id: 'drv_01',
      userId: 'usr_drv1',
      fullName: 'Rajesh Kumar Sahoo',
      phone: '+91 94371 11223',
      email: 'rajesh.driver@vahan360.com',
      address: 'Vill- Nuapatna, PO- Tigiria, Dist- Cuttack, Odisha 754030',
      dlNumber: 'OD0220180045129',
      dlExpiryDate: '2028-06-30',
      emergencyContact: 'Sujata Sahoo (Wife)',
      emergencyPhone: '+91 94371 88990',
      joiningDate: '2024-01-10',
      salaryType: 'monthly',
      agreedSalary: 18000,
      assignedVehicleId: 'veh_01',
      accountStatus: 'approved',
      notes: 'Experienced driver, safe record, handles inter-city cargo.',
      createdAt: '2024-01-10T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'drv_02',
      userId: 'usr_drv2',
      fullName: 'Bikash Swain',
      phone: '+91 94372 33445',
      email: 'bikash.driver@vahan360.com',
      address: 'Plot 45, Baramunda Housing Board Colony, Bhubaneswar 751003',
      dlNumber: 'OD3320200089234',
      dlExpiryDate: '2027-11-15',
      emergencyContact: 'Ranjan Swain (Brother)',
      emergencyPhone: '+91 94372 99001',
      joiningDate: '2024-03-01',
      salaryType: 'monthly',
      agreedSalary: 16500,
      assignedVehicleId: 'veh_02',
      accountStatus: 'approved',
      notes: 'Punctual, handles local Bhubaneswar-Cuttack routes.',
      createdAt: '2024-03-01T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'drv_03',
      userId: 'usr_drv3',
      fullName: 'Manoj Nayak',
      phone: '+91 94373 55667',
      email: 'manoj.driver@vahan360.com',
      address: 'At/PO- Pipili, Near Toll Gate, Puri, Odisha 752104',
      dlNumber: 'OD1320210034190',
      dlExpiryDate: '2029-03-22',
      emergencyContact: 'Santosh Nayak (Father)',
      emergencyPhone: '+91 94373 11234',
      joiningDate: '2026-10-20',
      salaryType: 'monthly',
      agreedSalary: 17000,
      accountStatus: 'pending_approval',
      notes: 'Awaiting admin verification of driving licence copy.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: now,
    },
  ];

  const documents: VehicleDocument[] = [
    {
      id: 'doc_01',
      vehicleId: 'veh_01',
      docType: 'insurance',
      docNumber: 'TATA-AIG-CV-2025-99218',
      issueDate: '2025-11-10',
      expiryDate: '2026-11-09',
      issuingAuthority: 'Tata AIG General Insurance',
      renewalCost: 18500,
      reminderDays: [30, 15, 7, 0],
      status: 'expiring_soon',
      createdAt: '2025-11-10T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'doc_02',
      vehicleId: 'veh_01',
      docType: 'fitness',
      docNumber: 'OD02-FC-2024-8172',
      issueDate: '2024-04-10',
      expiryDate: '2027-04-09',
      issuingAuthority: 'RTO Bhubaneswar-II',
      renewalCost: 3500,
      reminderDays: [30, 15, 7, 0],
      status: 'valid',
      createdAt: '2024-04-10T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'doc_03',
      vehicleId: 'veh_01',
      docType: 'puc',
      docNumber: 'PUC-OD02-2026-0491',
      issueDate: '2026-05-15',
      expiryDate: '2026-11-14',
      issuingAuthority: 'Bhubaneswar Green PUC Centre',
      renewalCost: 150,
      reminderDays: [15, 7, 0],
      status: 'expiring_soon',
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'doc_04',
      vehicleId: 'veh_02',
      docType: 'insurance',
      docNumber: 'ICICI-LOMB-CV-882194',
      issueDate: '2026-02-15',
      expiryDate: '2027-02-14',
      issuingAuthority: 'ICICI Lombard General Insurance',
      renewalCost: 15400,
      reminderDays: [30, 15, 7, 0],
      status: 'valid',
      createdAt: '2026-02-15T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'doc_05',
      vehicleId: 'veh_02',
      docType: 'puc',
      docNumber: 'PUC-OD33-2026-1102',
      issueDate: '2026-04-01',
      expiryDate: '2026-10-01',
      issuingAuthority: 'Dhenkanal Auto Emission Testing',
      renewalCost: 150,
      reminderDays: [15, 7, 0],
      status: 'expired',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'doc_06',
      vehicleId: 'veh_03',
      docType: 'permit',
      docNumber: 'STA-OD-NP-2024-5519',
      issueDate: '2024-09-05',
      expiryDate: '2029-09-04',
      issuingAuthority: 'State Transport Authority Odisha',
      renewalCost: 12000,
      reminderDays: [30, 15, 7, 0],
      status: 'valid',
      createdAt: '2024-09-05T00:00:00.000Z',
      updatedAt: now,
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust_01',
      name: 'Utkal Agro Foods Pvt Ltd',
      companyName: 'Utkal Agro Foods Pvt Ltd',
      contactPerson: 'Prabhat Mohanty',
      phone: '+91 94370 77889',
      email: 'logistics@utkalagro.com',
      billingAddress: 'Industrial Estate, Khurda, Odisha 752055',
      gstin: '21AAACU4920K1ZX',
      notes: 'Regular transport of packaged rice and pulses. Payment cycle: 15 days.',
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'cust_02',
      name: 'Kalinga Hardware & Pipes',
      companyName: 'Kalinga Hardware & Pipes',
      contactPerson: 'Sanjay Agarwal',
      phone: '+91 98610 55443',
      email: 'sales@kalingahardware.in',
      billingAddress: 'Station Square, Cuttack 753003',
      gstin: '21ABCPK8812J1ZR',
      notes: 'CPVC pipes, plumbing fittings, hardware dispatch.',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'cust_03',
      name: 'Jagannath Wholesale FMCG',
      companyName: 'Jagannath Trading Agency',
      contactPerson: 'Debendra Das',
      phone: '+91 99371 44556',
      email: 'jta.fmcg@gmail.com',
      billingAddress: 'Grand Road Market, Puri 752001',
      notes: 'Beverages and FMCG store supplies. Advance payment preferred.',
      createdAt: '2024-03-10T00:00:00.000Z',
      updatedAt: now,
    },
  ];

  const trips: Trip[] = [
    {
      id: 'trip_01',
      tripNumber: 'TRIP-2026-101',
      bookingDate: '2026-10-18',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      customerId: 'cust_01',
      customerContactPhone: '+91 94370 77889',
      loadingLocation: 'Khurda Warehouse #3',
      deliveryLocation: 'Angul Central Mandi',
      goodsDescription: 'Premium Basmati Rice (50 kg bags)',
      weightKg: 1200,
      tripStartDate: '2026-10-19T06:00:00.000Z',
      expectedDeliveryDate: '2026-10-19T18:00:00.000Z',
      actualCompletionDate: '2026-10-19T19:30:00.000Z',
      odometerStart: 48300,
      odometerEnd: 48650,
      distanceKm: 350,
      freightAmount: 9500,
      advanceReceived: 4000,
      balanceDue: 0,
      paymentStatus: 'paid',
      tripStatus: 'completed',
      notes: 'Delivered in good condition with signed acknowledgement.',
      createdAt: '2026-10-18T10:00:00.000Z',
      updatedAt: '2026-10-19T20:00:00.000Z',
    },
    {
      id: 'trip_02',
      tripNumber: 'TRIP-2026-102',
      bookingDate: '2026-10-21',
      vehicleId: 'veh_02',
      driverId: 'drv_02',
      customerId: 'cust_02',
      customerContactPhone: '+91 98610 55443',
      loadingLocation: 'Cuttack Hardware Godown',
      deliveryLocation: 'Bhubaneswar Patia Depot',
      goodsDescription: 'PVC Conduit Pipes and Sanitary Fittings',
      weightKg: 650,
      tripStartDate: '2026-10-22T08:00:00.000Z',
      expectedDeliveryDate: '2026-10-22T14:00:00.000Z',
      actualCompletionDate: '2026-10-22T13:45:00.000Z',
      odometerStart: 26320,
      odometerEnd: 26400,
      distanceKm: 80,
      freightAmount: 3800,
      advanceReceived: 1500,
      balanceDue: 2300,
      paymentStatus: 'partial',
      tripStatus: 'completed',
      notes: 'Remaining ₹2,300 bill submitted to accounting.',
      createdAt: '2026-10-21T09:30:00.000Z',
      updatedAt: '2026-10-22T14:00:00.000Z',
    },
    {
      id: 'trip_03',
      tripNumber: 'TRIP-2026-103',
      bookingDate: '2026-10-24',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      customerId: 'cust_03',
      customerContactPhone: '+91 99371 44556',
      loadingLocation: 'Rasulgarh Cold Depot, Bhubaneswar',
      deliveryLocation: 'Grand Road Market, Puri',
      goodsDescription: 'Packaged Biscuits and Bottled Fruit Juices',
      weightKg: 1100,
      tripStartDate: '2026-10-24T06:30:00.000Z',
      expectedDeliveryDate: '2026-10-24T16:00:00.000Z',
      odometerStart: 48650,
      freightAmount: 5200,
      advanceReceived: 2000,
      balanceDue: 3200,
      paymentStatus: 'partial',
      tripStatus: 'in_progress',
      notes: 'Active en-route delivery. Driver in touch via mobile.',
      createdAt: '2026-10-24T05:00:00.000Z',
      updatedAt: now,
    },
  ];

  const tripPayments: TripPayment[] = [
    {
      id: 'pay_01',
      tripId: 'trip_01',
      customerId: 'cust_01',
      amount: 4000,
      paymentDate: '2026-10-18',
      paymentMethod: 'upi',
      transactionRef: 'UPI/261018884920/UTKAL',
      notes: 'Booking advance via PhonePe',
      createdAt: '2026-10-18T10:15:00.000Z',
    },
    {
      id: 'pay_02',
      tripId: 'trip_01',
      customerId: 'cust_01',
      amount: 5500,
      paymentDate: '2026-10-20',
      paymentMethod: 'bank_transfer',
      transactionRef: 'NEFT-SBI-499102834',
      notes: 'Final settlement against delivery acknowledgement',
      createdAt: '2026-10-20T11:00:00.000Z',
    },
    {
      id: 'pay_03',
      tripId: 'trip_02',
      customerId: 'cust_02',
      amount: 1500,
      paymentDate: '2026-10-21',
      paymentMethod: 'cash',
      transactionRef: 'REC-0921',
      notes: 'Cash advance given at loading point',
      createdAt: '2026-10-21T09:45:00.000Z',
    },
    {
      id: 'pay_04',
      tripId: 'trip_03',
      customerId: 'cust_03',
      amount: 2000,
      paymentDate: '2026-10-24',
      paymentMethod: 'upi',
      transactionRef: 'UPI/261024991122/PURI',
      notes: 'Advance credited to business bank account',
      createdAt: '2026-10-24T05:15:00.000Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_01',
      expenseDate: '2026-10-19',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      tripId: 'trip_01',
      category: 'fuel',
      amount: 3200,
      paymentMethod: 'card',
      vendor: 'Indian Oil Dealer - Dhenkanal Bypass',
      description: 'Diesel 34.6 Litres @ ₹92.48/L for Angul trip',
      submittedBy: 'usr_drv1',
      approvalStatus: 'approved',
      approvedBy: 'usr_admin',
      approvalDate: '2026-10-20T08:00:00.000Z',
      createdAt: '2026-10-19T21:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 'exp_02',
      expenseDate: '2026-10-19',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      tripId: 'trip_01',
      category: 'toll_fastag',
      amount: 320,
      paymentMethod: 'fastag',
      vendor: 'NHAI Panikoili Toll Plaza',
      description: 'FASTag toll charges both ways',
      submittedBy: 'usr_drv1',
      approvalStatus: 'approved',
      approvedBy: 'usr_admin',
      approvalDate: '2026-10-20T08:00:00.000Z',
      createdAt: '2026-10-19T21:15:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 'exp_03',
      expenseDate: '2026-10-19',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      tripId: 'trip_01',
      category: 'driver_allowance',
      amount: 400,
      paymentMethod: 'cash',
      vendor: 'Driver Food Allowance',
      description: 'Daily meal & road allowance for Angul run',
      submittedBy: 'usr_drv1',
      approvalStatus: 'approved',
      approvedBy: 'usr_admin',
      approvalDate: '2026-10-20T08:00:00.000Z',
      createdAt: '2026-10-19T21:20:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 'exp_04',
      expenseDate: '2026-10-22',
      vehicleId: 'veh_02',
      driverId: 'drv_02',
      tripId: 'trip_02',
      category: 'fuel',
      amount: 850,
      paymentMethod: 'cash',
      vendor: 'HP Auto Care, Cuttack',
      description: 'Diesel 9.2 Litres for city delivery',
      submittedBy: 'usr_drv2',
      approvalStatus: 'approved',
      approvedBy: 'usr_admin',
      approvalDate: '2026-10-23T09:00:00.000Z',
      createdAt: '2026-10-22T14:30:00.000Z',
      updatedAt: '2026-10-23T09:00:00.000Z',
    },
    {
      id: 'exp_05',
      expenseDate: '2026-10-24',
      vehicleId: 'veh_01',
      driverId: 'drv_01',
      tripId: 'trip_03',
      category: 'toll_fastag',
      amount: 140,
      paymentMethod: 'fastag',
      vendor: 'Pipili Toll Plaza',
      description: 'Toll plaza deduction for Puri trip',
      submittedBy: 'usr_drv1',
      approvalStatus: 'pending',
      createdAt: '2026-10-24T07:15:00.000Z',
      updatedAt: now,
    },
    {
      id: 'exp_06',
      expenseDate: '2026-10-10',
      vehicleId: 'veh_01',
      category: 'vehicle_emi',
      amount: 14200,
      paymentMethod: 'bank_transfer',
      vendor: 'Mahindra Finance',
      description: 'Vehicle loan monthly EMI for Bolero Maxi Truck',
      submittedBy: 'usr_admin',
      approvalStatus: 'approved',
      approvedBy: 'usr_admin',
      approvalDate: '2026-10-10T10:00:00.000Z',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
  ];

  const salaryRecords: DriverSalaryRecord[] = [
    {
      id: 'sal_rec_01',
      driverId: 'drv_01',
      periodMonth: '2026-09',
      salaryType: 'monthly',
      baseSalary: 18000,
      tripAllowance: 1200,
      advancesDeducted: 3000,
      otherDeductions: 0,
      bonus: 1000,
      netPayable: 17200,
      paidAmount: 17200,
      balanceDue: 0,
      status: 'paid',
      notes: 'September salary disbursed via bank transfer on Oct 5.',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
    },
    {
      id: 'sal_rec_02',
      driverId: 'drv_02',
      periodMonth: '2026-09',
      salaryType: 'monthly',
      baseSalary: 16500,
      tripAllowance: 800,
      advancesDeducted: 2000,
      otherDeductions: 0,
      bonus: 500,
      netPayable: 15800,
      paidAmount: 15800,
      balanceDue: 0,
      status: 'paid',
      notes: 'September salary paid.',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
    },
    {
      id: 'sal_rec_03',
      driverId: 'drv_01',
      periodMonth: '2026-10',
      salaryType: 'monthly',
      baseSalary: 18000,
      tripAllowance: 800,
      advancesDeducted: 2000,
      otherDeductions: 0,
      bonus: 0,
      netPayable: 16800,
      paidAmount: 0,
      balanceDue: 16800,
      status: 'pending',
      notes: 'October salary calculation in progress.',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: now,
    },
  ];

  const salaryPayments: SalaryPayment[] = [
    {
      id: 'sal_pay_01',
      salaryRecordId: 'sal_rec_01',
      driverId: 'drv_01',
      amount: 17200,
      paymentType: 'salary',
      paymentDate: '2026-10-05',
      paymentMethod: 'bank_transfer',
      referenceNo: 'IMPS/6100588219/SAL',
      notes: 'September full settlement',
      createdAt: '2026-10-05T12:00:00.000Z',
    },
    {
      id: 'sal_pay_02',
      driverId: 'drv_01',
      amount: 2000,
      paymentType: 'advance',
      paymentDate: '2026-10-15',
      paymentMethod: 'upi',
      referenceNo: 'UPI/261015998123/ADV',
      notes: 'Festival advance for Dussehra',
      createdAt: '2026-10-15T15:30:00.000Z',
    },
  ];

  const maintenanceRecords: MaintenanceRecord[] = [
    {
      id: 'maint_01',
      vehicleId: 'veh_01',
      serviceDate: '2026-08-14',
      odometerReading: 45000,
      serviceType: 'periodic',
      workshopName: 'Odisha Commercial Truck Garage, Cuttack Road',
      mechanicName: 'Master Sanjeev',
      partsReplaced: 'Engine Oil (7.5L 15W-40), Oil Filter, Fuel Filter, Air Filter',
      partsCost: 3850,
      labourCost: 1200,
      totalCost: 5050,
      nextServiceDate: '2027-02-14',
      nextServiceOdometer: 55000,
      notes: 'Regular periodic service completed smoothly.',
      createdAt: '2026-08-14T00:00:00.000Z',
    },
    {
      id: 'maint_02',
      vehicleId: 'veh_03',
      serviceDate: '2026-10-23',
      odometerReading: 14800,
      serviceType: 'oil_change',
      workshopName: 'Ashok Leyland Authorized Service Centre, Mancheswar',
      mechanicName: 'Service Advisor Deepak',
      partsReplaced: 'Synthetic Oil, Washer, Sump Plug',
      partsCost: 2600,
      labourCost: 800,
      totalCost: 3400,
      nextServiceDate: '2027-04-20',
      nextServiceOdometer: 25000,
      notes: 'Vehicle currently undergoing 15k checkup.',
      createdAt: '2026-10-23T09:00:00.000Z',
    },
  ];

  const challans: Challan[] = [
    {
      id: 'chal_01',
      vehicleId: 'veh_01',
      challanNumber: 'OD02-CH-2026-08912',
      challanDate: '2026-09-12',
      violationDescription: 'Speed limit exceeded (68 km/h in 60 km/h zone on NH-16)',
      fineAmount: 1000,
      paymentDeadline: '2026-10-12',
      paymentStatus: 'paid',
      paymentDate: '2026-09-20',
      receiptUrl: '/receipts/challan_08912.pdf',
      notes: 'Paid online via official Parivahan e-Challan portal.',
      createdAt: '2026-09-12T14:00:00.000Z',
      updatedAt: '2026-09-20T11:00:00.000Z',
    },
    {
      id: 'chal_02',
      vehicleId: 'veh_02',
      challanNumber: 'OD33-CH-2026-01124',
      challanDate: '2026-10-14',
      violationDescription: 'Improper stop near bus bay / loading without parking indicator',
      fineAmount: 500,
      paymentDeadline: '2026-11-14',
      paymentStatus: 'unpaid',
      notes: 'Verify on echallan.parivahan.gov.in before paying.',
      createdAt: '2026-10-14T16:30:00.000Z',
      updatedAt: now,
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_01',
      type: 'driver_approval',
      title: 'New Driver Registration Pending',
      message: 'Manoj Nayak has signed up and is waiting for your verification and approval.',
      link: '/admin/drivers',
      isRead: false,
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'notif_02',
      type: 'doc_expiry',
      title: 'Vehicle Insurance Expiring Soon',
      message: 'Insurance for Mahindra Bolero (OD 02 AK 4589) expires in 16 days (09 Nov 2026).',
      link: '/admin/documents',
      isRead: false,
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'notif_03',
      type: 'doc_expiry',
      title: 'PUC Certificate Expired',
      message: 'Pollution Certificate for Tata Ace (OD 33 J 8820) expired on 01 Oct 2026. Urgent renewal required.',
      link: '/admin/documents',
      isRead: false,
      priority: 'critical',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
    {
      id: 'notif_04',
      type: 'expense_approval',
      title: 'Trip Expense Awaiting Approval',
      message: 'Driver Rajesh Kumar submitted ₹140 Toll FASTag claim for TRIP-2026-103.',
      link: '/admin/expenses',
      isRead: false,
      priority: 'normal',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const backups: BackupRecord[] = [
    {
      id: 'bak_01',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      filename: 'Vahan360_Full_Backup_2026-10-23_02-00-00.txt',
      backupType: 'scheduled_daily',
      recordCount: 42,
      documentCount: 6,
      fileSize: 48920,
      status: 'success',
      checksum: 'sha256-a1b2c3d4e5f6',
      storageLocation: 'data/backups/Vahan360_Full_Backup_2026-10-23_02-00-00.txt',
      notes: 'Automated nightly business data backup completed successfully.',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_01',
      userId: 'usr_admin',
      userName: 'Sushanta Nayak (Owner)',
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      details: 'Vahan360 fleet platform initialized with single Admin enforcement.',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'aud_02',
      userId: 'usr_admin',
      userName: 'Sushanta Nayak (Owner)',
      userRole: 'admin',
      action: 'SCHEDULED_BACKUP',
      entityType: 'Backup',
      entityId: 'bak_01',
      details: 'Nightly database snapshot verified and archived.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  return {
    version: '1.0.0',
    updatedAt: now,
    settings,
    users,
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
    backups,
    auditLogs,
  };
}

// High-reliability file sync with timestamp-based cache invalidation
let cachedDb: DatabaseSchema | null = null;
let lastLoadedMtime = 0;

export function getDatabase(): DatabaseSchema {
  ensureDirectories();

  // 1. Try reading from primary local data file
  try {
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (!cachedDb || stat.mtimeMs !== lastLoadedMtime) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        if (data && data.trim().length > 0) {
          const parsed = JSON.parse(data) as DatabaseSchema;
          if (parsed && parsed.settings && Array.isArray(parsed.users)) {
            cachedDb = parsed;
            lastLoadedMtime = stat.mtimeMs;
          }
        }
      }
      if (cachedDb) return cachedDb;
    }
  } catch (err) {
    console.error('Error reading primary database file, attempting recovery from autosave:', err);
    try {
      if (fs.existsSync(AUTOSAVE_BACKUP_FILE)) {
        const autoData = fs.readFileSync(AUTOSAVE_BACKUP_FILE, 'utf-8');
        const parsed = JSON.parse(autoData) as DatabaseSchema;
        if (parsed && parsed.settings && Array.isArray(parsed.users)) {
          cachedDb = parsed;
          // Self-heal primary DB_FILE
          try {
            fs.writeFileSync(DB_FILE, autoData, 'utf-8');
            lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
          } catch {}
          return cachedDb;
        }
      }
    } catch {}
  }

  // 2. Try reading from serverless /tmp fallback file
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const stat = fs.statSync(TMP_DB_FILE);
      if (!cachedDb || stat.mtimeMs !== lastLoadedMtime) {
        const data = fs.readFileSync(TMP_DB_FILE, 'utf-8');
        if (data && data.trim().length > 0) {
          const parsed = JSON.parse(data) as DatabaseSchema;
          if (parsed && parsed.settings && Array.isArray(parsed.users)) {
            cachedDb = parsed;
            lastLoadedMtime = stat.mtimeMs;
          }
        }
      }
      if (cachedDb) return cachedDb;
    }
  } catch {}

  // 3. If in-memory cache exists, return it
  if (cachedDb) return cachedDb;

  // 4. Create initial clean database if no database file exists yet
  cachedDb = getCleanEmptyDatabase();
  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  ensureDirectories();
  db.updatedAt = new Date().toISOString();
  cachedDb = db;

  const jsonStr = JSON.stringify(db, null, 2);

  // 1. First write to disaster-recovery autosave copy (ensures no data loss if disk interrupted)
  try {
    fs.writeFileSync(AUTOSAVE_BACKUP_FILE, jsonStr, 'utf-8');
  } catch {}

  // 2. Synchronously write directly to primary DB_FILE
  try {
    fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
    try {
      lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch {}
  } catch (err) {
    // Attempt atomic write via temporary file if direct write encounters temporary file lock
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, jsonStr, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
    } catch (e) {
      console.error('Save to local DB_FILE failed:', e);
    }
  }

  // 3. Also mirror to serverless TMP_DB_FILE for fallback resilience
  try {
    fs.writeFileSync(TMP_DB_FILE, jsonStr, 'utf-8');
  } catch {}
}

// Security: Enforce Exactly One Admin Rule
export function getSingleAdmin(): User | undefined {
  const db = getDatabase();
  return db.users.find((u) => u.role === 'admin');
}

export function canCreateAdmin(): boolean {
  const admin = getSingleAdmin();
  return !admin;
}

export function transferAdminOwnership(
  currentAdminId: string,
  newOwnerData: { name: string; email: string; phone: string; password: string }
): { success: boolean; message: string; newAdmin?: User } {
  const db = getDatabase();
  const currentAdminIndex = db.users.findIndex((u) => u.id === currentAdminId && u.role === 'admin');
  if (currentAdminIndex === -1) {
    return { success: false, message: 'Unauthorized: Current user is not the designated Admin.' };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newOwnerData.password, salt);

  const newAdmin: User = {
    id: `usr_admin_${Date.now()}`,
    name: newOwnerData.name,
    email: newOwnerData.email,
    phone: newOwnerData.phone,
    role: 'admin',
    status: 'active',
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Convert old admin to inactive/archived to preserve referential integrity without having 2 active admins
  db.users[currentAdminIndex].role = 'driver';
  db.users[currentAdminIndex].status = 'suspended';
  db.users[currentAdminIndex].updatedAt = new Date().toISOString();

  db.users.push(newAdmin);

  // Update business settings owner
  db.settings.ownerName = newOwnerData.name;
  db.settings.email = newOwnerData.email;
  db.settings.phone = newOwnerData.phone;
  db.settings.updatedAt = new Date().toISOString();

  // Audit log
  db.auditLogs.unshift({
    id: `aud_${Date.now()}`,
    userId: currentAdminId,
    userName: db.users[currentAdminIndex].name,
    userRole: 'admin',
    action: 'ADMIN_OWNERSHIP_TRANSFERRED',
    entityType: 'User',
    entityId: newAdmin.id,
    details: `Ownership transferred from ${db.users[currentAdminIndex].name} to ${newAdmin.name} (${newAdmin.email}).`,
    createdAt: new Date().toISOString(),
  });

  saveDatabase(db);
  return { success: true, message: 'Ownership transferred successfully.', newAdmin };
}

// Helper to log audit actions
export function logAudit(
  userId: string,
  userName: string,
  userRole: 'admin' | 'driver',
  action: string,
  entityType: string,
  details: string,
  entityId?: string
) {
  const db = getDatabase();
  const log: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    userRole,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase(db);
}
