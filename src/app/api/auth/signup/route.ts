import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { User, Driver, Notification } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      password,
      confirmPassword,
      dlNumber,
      dlExpiryDate,
      address,
      emergencyContact,
      emergencyPhone,
    } = body;

    // Validation
    if (!fullName || !phone || !password || !dlNumber || !dlExpiryDate) {
      return NextResponse.json(
        { error: 'Please provide all required fields (Name, Phone, Password, DL Number, DL Expiry).' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const db = getDatabase();
    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : `driver_${Date.now()}@vahan360.local`;
    const cleanDl = dlNumber.trim().toUpperCase();

    // Check for existing phone or DL
    const existingPhone = db.users.find((u) => u.phone === cleanPhone);
    if (existingPhone) {
      return NextResponse.json({ error: 'A user with this mobile number is already registered.' }, { status: 400 });
    }

    const existingDl = db.drivers.find((d) => d.dlNumber.toUpperCase() === cleanDl);
    if (existingDl) {
      return NextResponse.json({ error: 'A driver with this Driving Licence number is already registered.' }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const userId = `usr_drv_${Date.now()}`;
    const driverId = `drv_${Date.now()}`;
    const now = new Date().toISOString();

    // STRICT SECURITY RULE: Force role to 'driver' and status to 'pending_approval'
    const newUser: User = {
      id: userId,
      name: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: 'driver',
      status: 'pending_approval',
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const newDriver: Driver = {
      id: driverId,
      userId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address?.trim() || '',
      dlNumber: cleanDl,
      dlExpiryDate,
      emergencyContact: emergencyContact?.trim() || 'Not specified',
      emergencyPhone: emergencyPhone?.trim() || cleanPhone,
      joiningDate: now.slice(0, 10),
      salaryType: 'monthly',
      agreedSalary: 0, // Left at 0 until fleet owner reviews application and agrees on salary
      accountStatus: 'pending_approval',
      notes: 'Online driver application. Awaiting owner review and salary agreement.',
      createdAt: now,
      updatedAt: now,
    };

    // Create Admin notification
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type: 'driver_approval',
      title: 'New Driver Registration Pending',
      message: `${fullName.trim()} (DL: ${cleanDl}) registered and is awaiting your review.`,
      link: '/admin/drivers',
      isRead: false,
      priority: 'high',
      createdAt: now,
    };

    db.users.push(newUser);
    db.drivers.push(newDriver);
    db.notifications.unshift(notification);

    logAudit(
      userId,
      fullName.trim(),
      'driver',
      'DRIVER_SIGNUP',
      'Driver',
      `New driver registered: ${fullName.trim()} (${cleanPhone}). Awaiting admin approval.`,
      driverId
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully! Your account is pending Admin approval.',
      driver: {
        id: driverId,
        fullName: newDriver.fullName,
        phone: newDriver.phone,
        status: newDriver.accountStatus,
      },
    });
  } catch (err: any) {
    console.error('Driver signup error:', err);
    return NextResponse.json({ error: 'Server error processing registration.' }, { status: 500 });
  }
}
