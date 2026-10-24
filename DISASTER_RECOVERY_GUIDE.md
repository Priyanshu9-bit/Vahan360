# VAHAN360 — COMPREHENSIVE DISASTER RECOVERY & RESTORATION GUIDE

This document provides step-by-step procedures to restore the entire **Vahan360** fleet management application and recover all business records in the event of hardware failure, database deletion, cloud hosting provider termination, or server crash.

---

## 1. Architecture & Backup Fundamentals

Vahan360 maintains a multi-layer disaster recovery strategy:
1. **Full UTF-8 TXT Backup (`Vahan360_Full_Backup_YYYY-MM-DD_HH-mm-ss.txt`)**: Contains all business settings, vehicles, documents, drivers, customers, trips, payments, expenses, salaries, maintenance, challans, and audit logs in an unambiguous structured format. Secret credentials (passwords, JWT keys) are strictly excluded.
2. **Documents ZIP Backup (`Vahan360_Documents_Backup_YYYY-MM-DD.zip`)**: Contains all uploaded vehicle compliance documents, RC/insurance scans, driver licence copies, maintenance bills, and expense vouchers with `DOCUMENT_MANIFEST.json`.
3. **Automated Server-Side Nightly Backups**: Kept in `data/backups/` with a 30-day rolling retention policy.
4. **Cloud PostgreSQL / Supabase Schema (`supabase_schema.sql`)**: Ready for cloud database provisioning with full Row Level Security (RLS) policies.

---

## 2. Emergency Recovery Scenarios

### Scenario A: Accidental Data Corruption or User Error
If records were mistakenly deleted or corrupted:
1. Log in to the Admin Dashboard.
2. Navigate to **Backup & Restore** (`/admin/backup`).
3. Under **Restore from Backup**, click **Upload Backup (.txt)** and select your latest valid TXT backup.
4. The system validates the file structure and presents a preview showing the counts of vehicles, drivers, trips, expenses, and payments.
5. Click **Confirm & Restore Database**.
6. The system automatically creates a pre-restoration rollback snapshot before importing.
7. Existing admin access is preserved so you are never locked out.

---

### Scenario B: Database Server Crashed / `data/vahan360_db.json` Deleted
If the server's storage was wiped or corrupted:
1. SSH into the server or access your hosting terminal.
2. Locate the most recent automated backup in `data/backups/`:
   ```bash
   ls -la data/backups/
   ```
3. Open the Admin UI at `/admin/backup` and upload the file, OR manually trigger the restore API:
   ```bash
   curl -X POST http://localhost:3000/api/backup/restore \
     -H "Content-Type: application/json" \
     -d @data/backups/Vahan360_Full_Backup_2026-10-23_02-00-00.txt
   ```
4. Restart the Next.js application service (`npm run dev` or PM2 / systemd):
   ```bash
   pm2 restart vahan360
   ```

---

### Scenario C: Complete Server / Hosting Account Loss (Fresh Server Deployment)

Follow this 8-step recovery procedure to bring Vahan360 up on a completely new virtual machine or hosting provider (e.g. AWS, DigitalOcean, Vercel, Render):

#### Step 1: Provision Server & Install Runtime
Install Node.js v20+ and git:
```bash
# On Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

#### Step 2: Clone or Deploy Vahan360 Source Code
```bash
git clone <your-repository-url> vahan360
cd vahan360
npm install
```

#### Step 3: Configure Environment Variables
Create `.env.local` or set production environment variables:
```env
SESSION_SECRET="your-new-high-entropy-random-secret-key-360"
CRON_SECRET="your-secure-nightly-cron-token"
PORT=3000
NODE_ENV=production
```

#### Step 4: Provision PostgreSQL / Supabase (If using Cloud DB)
If using Supabase or managed PostgreSQL:
1. Create a new Supabase project at `https://supabase.com`.
2. Open the **SQL Editor** in Supabase.
3. Paste the complete contents of `supabase_schema.sql` and run it.
4. Add Supabase credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
   ```

#### Step 5: Restore Database Records
1. Start the application:
   ```bash
   npm run build
   npm run start
   ```
2. Open your browser and navigate to `http://<server-ip>:3000/login`.
3. Log in with the default admin account:
   - **Email / Phone**: `admin@vahan360.com` or `+91 98765 43210`
   - **Password**: `Admin@360`
4. Go directly to **Backup & Restore** (`/admin/backup`).
5. Upload your latest downloaded `Vahan360_Full_Backup_*.txt` file.
6. Verify the entity summary counts and click **Restore**.

#### Step 6: Restore Uploaded Document Files & Receipts
1. Extract your `Vahan360_Documents_Backup_*.zip` archive:
   ```bash
   unzip Vahan360_Documents_Backup_*.zip -d temp_docs/
   mv temp_docs/uploads/* data/uploads/
   rm -rf temp_docs
   ```
2. Verify all files have read permissions.

#### Step 7: Verify Fleet & Accounting Totals
1. Check the **Dashboard** (`/admin/dashboard`):
   - Total Vehicles matches physical fleet (e.g. 3 Boleros / Aces).
   - Monthly Freight, Expenses, and Operating Profit match historical records.
   - Pending customer dues match invoices.
2. Check **Documents & Compliance** (`/admin/documents`):
   - Expiry dates for Insurance, RC, PUC, Fitness match official certificates.

#### Step 8: Test Authentication & Access
1. Change the Admin password under **Settings** (`/admin/settings`).
2. Test Driver login using driver credentials to verify restricted access.
3. The system is now 100% restored and fully operational!

---

## 3. Scheduled Automated Backup Configuration

To run automatic daily backups without needing any user to be logged in:

### Using Linux Crontab:
```bash
# Run every night at 02:00 AM IST
0 2 * * * curl -X GET http://localhost:3000/api/backup/cron -H "Authorization: Bearer vahan360-cron-secret-2026" >> /var/log/vahan360_backup.log 2>&1
```

### Using Vercel Cron (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/backup/cron",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

*Vahan360 — Built for Resilience and Fleet Continuity.*
