import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDatabase();

    let userNotifs = db.notifications || [];
    if (user.role === 'driver') {
      userNotifs = userNotifs.filter((n) => n.targetUserId === user.id);
    } else {
      // Admin sees notifications targeted to admin or general system notifications
      userNotifs = userNotifs.filter((n) => !n.targetUserId || n.targetUserId === user.id);
    }

    // Sort newest first
    userNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = userNotifs.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: userNotifs.slice(0, 50),
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, markAllRead } = body;
    const db = getDatabase();

    if (markAllRead) {
      db.notifications.forEach((n) => {
        if (user.role === 'driver') {
          if (n.targetUserId === user.id) {
            n.isRead = true;
          }
        } else {
          if (!n.targetUserId || n.targetUserId === user.id) {
            n.isRead = true;
          }
        }
      });
    } else if (id) {
      const notif = db.notifications.find((n) => n.id === id);
      if (notif) notif.isRead = true;
    }

    saveDatabase(db);

    // Calculate updated unread count for caller
    let userNotifs = db.notifications || [];
    if (user.role === 'driver') {
      userNotifs = userNotifs.filter((n) => n.targetUserId === user.id);
    } else {
      userNotifs = userNotifs.filter((n) => !n.targetUserId || n.targetUserId === user.id);
    }
    const unreadCount = userNotifs.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clearRead = url.searchParams.get('clearRead') === 'true';
    const db = getDatabase();

    if (clearRead) {
      db.notifications = db.notifications.filter((n) => {
        const isUserNotif =
          user.role === 'driver'
            ? n.targetUserId === user.id
            : !n.targetUserId || n.targetUserId === user.id;
        if (isUserNotif && n.isRead) {
          return false; // Remove read notification
        }
        return true;
      });
    } else if (id) {
      db.notifications = db.notifications.filter((n) => n.id !== id);
    }

    saveDatabase(db);

    let userNotifs = db.notifications || [];
    if (user.role === 'driver') {
      userNotifs = userNotifs.filter((n) => n.targetUserId === user.id);
    } else {
      userNotifs = userNotifs.filter((n) => !n.targetUserId || n.targetUserId === user.id);
    }
    const unreadCount = userNotifs.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
