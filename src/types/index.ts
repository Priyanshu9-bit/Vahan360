export type UserRole = 'admin' | 'driver';

export type UserStatus = 'active' | 'approved' | 'pending_approval' | 'suspended' | 'rejected' | 'resigned' | 'removed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
  securityPinHash?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  currency: string;
  timezone: string;
  language: 'en' | 'hi' | 'or';
  autoBackupEnabled: boolean;
  backupRetentionDays: number;
  lastBackupDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type VehicleFuelType = 'Diesel' | 'CNG' | 'Electric' | 'Petrol';
export type VehicleStatus = 'active' | 'in_service' | 'inactive' | 'archived';

export interface VehicleLoanDetails {
  financer: string;
  loanAccountNumber?: string;
  totalLoanAmount: number;
  emiAmount: number;
  tenureMonths: number;
  startDate: string;
  endDate?: string;
}

export interface Vehicle {
  id: string;
  regNumber: string;
  name: string;
  manufacturer: string;
  model: string;
  vehicleType: string;
  regDate: string;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType: VehicleFuelType;
  currentOdometer: number;
  purchaseDate: string;
  purchasePrice: number;
  loanDetails?: VehicleLoanDetails;
  status: VehicleStatus;
  assignedDriverId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'rc' 
  | 'insurance' 
  | 'fitness' 
  | 'puc' 
  | 'permit' 
  | 'road_tax' 
  | 'driving_licence'
  | 'other';

export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'renewal_pending';

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  docType: DocumentType;
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  fileUrl?: string;
  fileName?: string;
  renewalCost?: number;
  reminderDays: number[];
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export type SalaryType = 'monthly' | 'per_trip' | 'daily';

export interface Driver {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  dlNumber: string;
  dlExpiryDate: string;
  dlDocumentUrl?: string;
  emergencyContact: string;
  emergencyPhone: string;
  joiningDate: string;
  salaryType: SalaryType;
  agreedSalary: number;
  assignedVehicleId?: string;
  accountStatus: UserStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  contactPerson: string;
  phone: string;
  email?: string;
  billingAddress: string;
  gstin?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TripStatus = 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Trip {
  id: string;
  tripNumber: string;
  bookingDate: string;
  vehicleId: string;
  driverId: string;
  customerId: string;
  customerName?: string;
  customerContactPhone: string;
  loadingLocation: string;
  deliveryLocation: string;
  goodsDescription: string;
  weightKg: number;
  tripStartDate: string;
  expectedDeliveryDate: string;
  actualCompletionDate?: string;
  odometerStart: number;
  odometerEnd?: number;
  distanceKm?: number;
  freightAmount: number;
  advanceReceived: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  tripStatus: TripStatus;
  notes?: string;
  deliveryProofUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'fastag';

export interface TripPayment {
  id: string;
  tripId: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'fuel'
  | 'engine_oil'
  | 'repairs'
  | 'servicing'
  | 'tyres'
  | 'spare_parts'
  | 'toll_fastag'
  | 'driver_salary'
  | 'driver_allowance'
  | 'driver_advance'
  | 'insurance'
  | 'permit_renewal'
  | 'fitness_renewal'
  | 'puc'
  | 'road_tax'
  | 'challan_fine'
  | 'parking'
  | 'loading_unloading'
  | 'vehicle_emi'
  | 'administrative'
  | 'other';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  expenseDate: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  vendor?: string;
  description: string;
  receiptUrl?: string;
  receiptName?: string;
  submittedBy: string; // userId
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverSalaryRecord {
  id: string;
  driverId: string;
  periodMonth: string; // YYYY-MM
  salaryType: SalaryType;
  baseSalary: number;
  tripAllowance: number;
  advancesDeducted: number;
  otherDeductions: number;
  bonus: number;
  netPayable: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'pending' | 'partially_paid' | 'paid';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryPayment {
  id: string;
  salaryRecordId?: string;
  driverId: string;
  amount: number;
  paymentType: 'salary' | 'advance' | 'allowance' | 'bonus';
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export type MaintenanceType = 'periodic' | 'oil_change' | 'tyre' | 'brakes_clutch' | 'battery' | 'repair' | 'other';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  odometerReading: number;
  serviceType: MaintenanceType;
  workshopName: string;
  mechanicName?: string;
  partsReplaced: string;
  partsCost: number;
  labourCost: number;
  totalCost: number;
  nextServiceDate?: string;
  nextServiceOdometer?: number;
  invoiceUrl?: string;
  invoiceName?: string;
  notes?: string;
  createdAt: string;
}

export type ChallanStatus = 'unpaid' | 'paid' | 'disputed' | 'under_review';

export interface Challan {
  id: string;
  vehicleId: string;
  challanNumber: string;
  challanDate: string;
  violationDescription: string;
  fineAmount: number;
  paymentDeadline?: string;
  paymentStatus: ChallanStatus;
  paymentDate?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'driver_approval'
  | 'driver_resignation'
  | 'expense_approval'
  | 'doc_expiry'
  | 'maintenance_due'
  | 'challan_unpaid'
  | 'trip_update'
  | 'salary_payment'
  | 'backup_status';

export interface Notification {
  id: string;
  targetUserId?: string; // empty means all admins
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  filename: string;
  backupType: 'scheduled_daily' | 'manual_txt' | 'documents_zip' | 'database_json';
  recordCount: number;
  documentCount: number;
  fileSize: number;
  status: 'success' | 'failed';
  checksum: string;
  storageLocation: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  version: string;
  updatedAt: string;
  settings: BusinessSettings;
  users: User[];
  vehicles: Vehicle[];
  documents: VehicleDocument[];
  drivers: Driver[];
  customers: Customer[];
  trips: Trip[];
  tripPayments: TripPayment[];
  expenses: Expense[];
  salaryRecords: DriverSalaryRecord[];
  salaryPayments: SalaryPayment[];
  maintenanceRecords: MaintenanceRecord[];
  challans: Challan[];
  notifications: Notification[];
  backups: BackupRecord[];
  auditLogs: AuditLog[];
}
