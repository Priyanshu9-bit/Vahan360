# VAHAN360 — Commercial Vehicle Management System

> **"Complete Control of Your Fleet."**  
> *Your Fleet. Your Business. One Platform.*

Vahan360 is a full-stack, responsive commercial vehicle fleet management system built specifically for Indian transport business owners managing pickup vehicles (e.g., Mahindra Bolero Maxi Truck, Tata Ace Gold, Ashok Leyland Dost, etc.).

---

## 🚀 Key Features

### 1. Fleet & Vehicle Lifecycle Management
- Full CRUD for pickup trucks, mini-trucks, and heavy commercial vehicles.
- Detailed tracking: Registration number, chassis & engine numbers, purchase price, odometer reading, fuel type, financing & EMI schedules.
- Vehicle-level profitability dashboard (Revenue - Fuel - Maintenance = Net Margin).

### 2. Driver & Staff Operations
- **Single-Admin Enforcement**: Exactly 1 owner/admin account can exist at the server and database levels.
- **Public Driver Signup**: Drivers register with DL number, licence expiry, phone, and emergency contact.
- **Approval Workflow**: Driver accounts enter `pending_approval` status and cannot access private business records until Admin approves.
- **Driver Dashboard**: Clean, restricted portal where drivers can view assigned trips, submit live trip expenses with receipts, and review their salary statements.

### 3. Trip & Freight Management
- Complete consignment lifecycle: `planned` ➔ `assigned` ➔ `in_progress` ➔ `completed`.
- Odometer tracking, route details, customer contact, and delivery instructions.
- **Trip Operating Profit**: Automatically calculates `Trip Freight Revenue - Direct Trip Expenses (Fuel + Toll + Labour + Allowance)`.
- **Partial Payments Ledger**: Handles advances, partial bank transfers, and computes real-time outstanding balances.

### 4. Expense Tracking & Approval
- 20 Indian commercial transport expense categories (Diesel, Engine Oil, Fastag/Toll, Servicing, Tyres, Challans, EMI, Driver Allowances, etc.).
- Driver submission queue with Admin approval/rejection and reimbursement tracking.

### 5. Document & Compliance Matrix
- Centralized tracking for:
  - Vehicle RC
  - Commercial Insurance
  - Fitness Certificate
  - PUC (Pollution Under Control)
  - National / State Goods Permit
  - Road Tax
  - Driver Commercial Driving Licences
- Dynamic 30-day, 15-day, 7-day expiry badges (`Valid`, `Expiring Soon`, `Expired`, `Renewal Pending`).

### 6. Traffic Challan Management
- Record challan numbers, fine amounts, violation details, and payment statuses (`Unpaid`, `Paid`, `Disputed`).
- Direct integration link to the official Government of India [Parivahan e-Challan Portal](https://echallan.parivahan.gov.in/).

### 7. Driver Payroll & Advances
- Monthly salary calculation with trip allowances, performance bonuses, advance deductions, and cash/UPI receipts.

### 8. Financial Accounting & Reports
- Real-time P&L, Monthly cashflow trends, Vehicle-wise ROI, Customer outstanding ledgers.
- 1-click CSV exports for Vehicles, Drivers, Trips, Customers, Expenses, and Salaries.

### 9. Disaster Recovery & Backup Engine (Critical Feature)
- **`Download Full Backup (.txt)`**: UTF-8 encoded, clean structured export of the entire business database (passwords & tokens strictly stripped).
- **`Download Documents Backup (.zip)`**: Bundles all uploaded RC cards, insurance certificates, and expense receipts.
- **`Restore from Backup`**: Admin-only restoration feature that validates file format, previews record counts, creates an automatic rollback snapshot, and restores relational data without duplication.
- **Scheduled Daily Backups**: Automated server-side backups with 30-day retention.
- Step-by-step restoration procedures documented in [`DISASTER_RECOVERY_GUIDE.md`](./DISASTER_RECOVERY_GUIDE.md).

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Navy Blue `#0f172a` primary, Emerald green for profit, Amber for warnings, Rose for overdue)
- **Charts & Visualizations**: Recharts
- **Icons**: Lucide React
- **Validation**: Zod & Bcryptjs
- **Archiving**: JSZip
- **Database Engine**:
  - Dual-mode architecture:
    1. Built-in ACID File Database (`data/vahan360_db.json`) for instant zero-dependency local operation.
    2. Enterprise PostgreSQL schema with Row Level Security (`supabase_schema.sql`) for cloud deployment.

---

## 💻 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Acceptance Tests (37 Tests)
```bash
npm test
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🔑 Demo Credentials

| Role | Email / Phone | Password | Access Level |
|---|---|---|---|
| **Fleet Owner (Admin)** | `admin@vahan360.com` or `9876543210` | `admin123` | Full Owner Access (All 15 modules & backups) |
| **Approved Driver** | `driver@vahan360.com` or `9812345678` | `driver123` | Driver Dashboard (Assigned vehicle & trips) |
| **Pending Driver** | `pending@vahan360.com` or `9823456789` | `driver123` | Waiting for Approval Page |

---

## 📂 Project Structure

```
Vahan360/
├── data/
│   └── vahan360_db.json        # Seeded ACID persistent JSON database
├── src/
│   ├── app/
│   │   ├── admin/              # Admin pages (Dashboard, Vehicles, Drivers, Trips, Backup, etc.)
│   │   ├── driver/             # Driver portal (Dashboard, Trips, Expenses, Salary, Documents)
│   │   ├── api/                # 20+ secure REST API routes with role authorization
│   │   ├── login/              # Unified login with 1-click demo buttons
│   │   ├── driver-signup/      # Public driver onboarding
│   │   ├── approval-pending/   # Pending verification holding screen
│   │   └── access-restricted/  # Suspended account screen
│   ├── components/             # Reusable UI (Sidebar, Navbar, StatCard, StatusBadge, Modal, Logo)
│   ├── lib/
│   │   ├── db.ts               # Core Database engine with single-admin enforcement
│   │   ├── auth.ts             # Session & role validation
│   │   ├── accounting.ts       # Indian currency formatters & profit calculation engine
│   │   └── backup.ts           # Full TXT and ZIP backup/restore engine
│   ├── scripts/
│   │   └── run-tests.ts        # Comprehensive 37-point acceptance test suite
│   └── types/
│       └── index.ts            # Complete TypeScript domain models
├── supabase_schema.sql         # Production PostgreSQL DDL with RLS policies
├── DISASTER_RECOVERY_GUIDE.md  # Comprehensive disaster recovery manual
└── README.md                   # Project overview & documentation
```

---

## 🛡 Security Highlights

1. **Strict Single Admin Rule**: Guaranteed by database constraints and server transactional checks.
2. **Password Protection**: Passwords are hashed with salt rounds using `bcryptjs` and are never exposed in backups or APIs.
3. **Driver Privilege Separation**: Drivers cannot view overall business profit, financial reports, or other drivers' payroll records.
4. **Disaster Snapshot Safety**: Every backup restore operation takes an automatic pre-restore safety snapshot before applying changes.
