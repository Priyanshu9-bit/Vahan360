import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { Notification } from '@/types';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { approvalStatus, approvalNotes } = body;

    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    const db = getDatabase();
    const expenseIndex = db.expenses.findIndex((e) => e.id === id);
    if (expenseIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const currentExpense = db.expenses[expenseIndex];
    currentExpense.approvalStatus = approvalStatus;
    currentExpense.approvedBy = admin.id;
    currentExpense.approvalDate = new Date().toISOString();
    currentExpense.approvalNotes = approvalNotes?.trim() || '';
    currentExpense.updatedAt = new Date().toISOString();

    // If submitted by driver, notify driver
    const driver = db.drivers.find((d) => d.id === currentExpense.driverId || d.userId === currentExpense.submittedBy);
    if (driver) {
      const notif: Notification = {
        id: `notif_${Date.now()}`,
        targetUserId: driver.userId,
        type: 'expense_approval',
        title: `Expense Claim ${approvalStatus.toUpperCase()}`,
        message: `Your claim for ₹${currentExpense.amount} (${currentExpense.category}) has been ${approvalStatus}.${approvalNotes ? ` Note: ${approvalNotes}` : ''}`,
        link: '/driver/expenses',
        isRead: false,
        priority: approvalStatus === 'approved' ? 'normal' : 'high',
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);
    }

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'EXPENSE_STATUS_UPDATE',
      'Expense',
      `${approvalStatus.toUpperCase()} expense claim of ₹${currentExpense.amount} for ${driver?.fullName || 'vehicle'}`,
      id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, expense: currentExpense });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
