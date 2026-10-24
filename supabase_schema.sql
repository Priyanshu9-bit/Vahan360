-- ====================================================================
-- VAHAN360 - COMMERCIAL VEHICLE FLEET MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Production Schema & Security Configuration
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'driver');
CREATE TYPE user_status AS ENUM ('active', 'pending_approval', 'suspended', 'rejected');
CREATE TYPE vehicle_status AS ENUM ('active', 'in_service', 'inactive', 'archived');
CREATE TYPE vehicle_fuel_type AS ENUM ('Diesel', 'CNG', 'Electric', 'Petrol');
CREATE TYPE document_type AS ENUM ('rc', 'insurance', 'fitness', 'puc', 'permit', 'road_tax', 'driving_licence', 'other');
CREATE TYPE document_status AS ENUM ('valid', 'expiring_soon', 'expired', 'renewal_pending');
CREATE TYPE salary_type AS ENUM ('monthly', 'per_trip', 'daily');
CREATE TYPE trip_status AS ENUM ('planned', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'fastag');
CREATE TYPE expense_category AS ENUM (
  'fuel', 'engine_oil', 'repairs', 'servicing', 'tyres', 'spare_parts',
  'toll_fastag', 'driver_salary', 'driver_allowance', 'driver_advance',
  'insurance', 'permit_renewal', 'fitness_renewal', 'puc', 'road_tax',
  'challan_fine', 'parking', 'loading_unloading', 'vehicle_emi',
  'administrative', 'other'
);
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE challan_status AS ENUM ('unpaid', 'paid', 'disputed', 'under_review');
CREATE TYPE notif_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- 3. BUSINESS SETTINGS TABLE
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(255) NOT NULL,
  tagline VARCHAR(255) DEFAULT 'Complete Control of Your Fleet.',
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  gstin VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  language VARCHAR(10) DEFAULT 'en',
  auto_backup_enabled BOOLEAN DEFAULT TRUE,
  backup_retention_days INT DEFAULT 30,
  last_backup_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USERS & PROFILES TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  status user_status NOT NULL DEFAULT 'pending_approval',
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL RULE: Database constraint ensuring EXACTLY ONE active Admin exists
CREATE UNIQUE INDEX single_active_admin_idx ON users (role) 
WHERE role = 'admin' AND status = 'active';

-- 5. VEHICLES TABLE
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reg_number VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  reg_date DATE NOT NULL,
  chassis_number VARCHAR(100),
  engine_number VARCHAR(100),
  fuel_type vehicle_fuel_type NOT NULL DEFAULT 'Diesel',
  current_odometer INT NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC(12, 2) NOT NULL,
  loan_financer VARCHAR(100),
  loan_account_number VARCHAR(100),
  loan_amount NUMERIC(12, 2) DEFAULT 0,
  loan_emi NUMERIC(12, 2) DEFAULT 0,
  loan_tenure_months INT DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'active',
  assigned_driver_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VEHICLE DOCUMENTS TABLE
CREATE TABLE vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  doc_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_authority VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_name VARCHAR(255),
  renewal_cost NUMERIC(10, 2) DEFAULT 0,
  reminder_days INT[] DEFAULT '{30, 15, 7, 0}',
  status document_status NOT NULL DEFAULT 'valid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DRIVERS TABLE
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT NOT NULL,
  dl_number VARCHAR(50) UNIQUE NOT NULL,
  dl_expiry_date DATE NOT NULL,
  dl_document_url TEXT,
  emergency_contact VARCHAR(255) NOT NULL,
  emergency_phone VARCHAR(20) NOT NULL,
  joining_date DATE NOT NULL,
  salary_type salary_type NOT NULL DEFAULT 'monthly',
  agreed_salary NUMERIC(10, 2) NOT NULL,
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  account_status user_status NOT NULL DEFAULT 'pending_approval',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update foreign key on vehicles for assigned driver
ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_driver FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- 8. CUSTOMERS TABLE
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_person VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  billing_address TEXT NOT NULL,
  gstin VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRIPS TABLE
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number VARCHAR(50) UNIQUE NOT NULL,
  booking_date DATE NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_contact_phone VARCHAR(20) NOT NULL,
  loading_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  goods_description TEXT NOT NULL,
  weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  trip_start_date TIMESTAMPTZ NOT NULL,
  expected_delivery_date TIMESTAMPTZ NOT NULL,
  actual_completion_date TIMESTAMPTZ,
  odometer_start INT NOT NULL,
  odometer_end INT,
  distance_km INT,
  freight_amount NUMERIC(12, 2) NOT NULL,
  advance_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12, 2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  trip_status trip_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  delivery_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TRIP PAYMENTS TABLE
CREATE TABLE trip_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  transaction_ref VARCHAR(100),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXPENSES TABLE
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date DATE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  category expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  vendor VARCHAR(255),
  description TEXT NOT NULL,
  receipt_url TEXT,
  receipt_name VARCHAR(255),
  submitted_by UUID NOT NULL REFERENCES users(id),
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DRIVER SALARY RECORDS
CREATE TABLE driver_salary_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL, -- YYYY-MM
  salary_type salary_type NOT NULL,
  base_salary NUMERIC(10, 2) NOT NULL,
  trip_allowance NUMERIC(10, 2) DEFAULT 0,
  advances_deducted NUMERIC(10, 2) DEFAULT 0,
  other_deductions NUMERIC(10, 2) DEFAULT 0,
  bonus NUMERIC(10, 2) DEFAULT 0,
  net_payable NUMERIC(10, 2) NOT NULL,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, period_month)
);

-- 13. SALARY PAYMENTS TABLE
CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_record_id UUID REFERENCES driver_salary_records(id) ON DELETE SET NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_type VARCHAR(30) NOT NULL DEFAULT 'salary',
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'bank_transfer',
  reference_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. VEHICLE MAINTENANCE TABLE
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  odometer_reading INT NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  workshop_name VARCHAR(255) NOT NULL,
  mechanic_name VARCHAR(255),
  parts_replaced TEXT,
  parts_cost NUMERIC(10, 2) DEFAULT 0,
  labour_cost NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(10, 2) NOT NULL,
  next_service_date DATE,
  next_service_odometer INT,
  invoice_url TEXT,
  invoice_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CHALLANS TABLE
CREATE TABLE challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  challan_number VARCHAR(100) UNIQUE NOT NULL,
  challan_date DATE NOT NULL,
  violation_description TEXT NOT NULL,
  fine_amount NUMERIC(10, 2) NOT NULL,
  payment_deadline DATE,
  payment_status challan_status NOT NULL DEFAULT 'unpaid',
  payment_date DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  priority notif_priority NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. BACKUP RECORDS TABLE
CREATE TABLE backup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filename VARCHAR(255) NOT NULL,
  backup_type VARCHAR(50) NOT NULL,
  record_count INT NOT NULL,
  document_count INT NOT NULL,
  file_size BIGINT NOT NULL,
  status VARCHAR(30) NOT NULL,
  checksum VARCHAR(100) NOT NULL,
  storage_location TEXT NOT NULL,
  notes TEXT
);

-- 18. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  user_role user_role NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  details TEXT NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is Admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. ADMIN POLICIES (Full Access to Everything)
CREATE POLICY admin_all_users ON users FOR ALL USING (is_admin());
CREATE POLICY admin_all_vehicles ON vehicles FOR ALL USING (is_admin());
CREATE POLICY admin_all_docs ON vehicle_documents FOR ALL USING (is_admin());
CREATE POLICY admin_all_drivers ON drivers FOR ALL USING (is_admin());
CREATE POLICY admin_all_customers ON customers FOR ALL USING (is_admin());
CREATE POLICY admin_all_trips ON trips FOR ALL USING (is_admin());
CREATE POLICY admin_all_trip_payments ON trip_payments FOR ALL USING (is_admin());
CREATE POLICY admin_all_expenses ON expenses FOR ALL USING (is_admin());
CREATE POLICY admin_all_salary ON driver_salary_records FOR ALL USING (is_admin());
CREATE POLICY admin_all_salary_payments ON salary_payments FOR ALL USING (is_admin());
CREATE POLICY admin_all_maintenance ON maintenance_records FOR ALL USING (is_admin());
CREATE POLICY admin_all_challans ON challans FOR ALL USING (is_admin());
CREATE POLICY admin_all_notifs ON notifications FOR ALL USING (is_admin());
CREATE POLICY admin_all_backups ON backup_history FOR ALL USING (is_admin());
CREATE POLICY admin_all_audit ON audit_logs FOR ALL USING (is_admin());

-- 2. DRIVER POLICIES (Strict Data Segregation)
-- Drivers can read their own profile
CREATE POLICY driver_read_own_profile ON drivers 
FOR SELECT USING (user_id = auth.uid());

-- Drivers can read assigned vehicle
CREATE POLICY driver_read_assigned_vehicle ON vehicles 
FOR SELECT USING (
  id IN (SELECT assigned_vehicle_id FROM drivers WHERE user_id = auth.uid())
);

-- Drivers can read only trips assigned to them
CREATE POLICY driver_read_own_trips ON trips 
FOR SELECT USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Drivers can update trip status only for their own trips
CREATE POLICY driver_update_own_trip_status ON trips 
FOR UPDATE USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Drivers can submit expenses for trips assigned to them
CREATE POLICY driver_insert_expenses ON expenses 
FOR INSERT WITH CHECK (
  submitted_by = auth.uid()
);

-- Drivers can view only their own submitted expenses
CREATE POLICY driver_read_own_expenses ON expenses 
FOR SELECT USING (
  submitted_by = auth.uid()
);

-- Drivers can view their own salary records
CREATE POLICY driver_read_own_salary ON driver_salary_records 
FOR SELECT USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Drivers can view their own notifications
CREATE POLICY driver_read_own_notifs ON notifications 
FOR SELECT USING (
  target_user_id = auth.uid()
);
