import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'vahan360_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'vahan360-fleet-secure-key-2026-prod-jwt-secret';

interface SessionPayload {
  userId: string;
  role: 'admin' | 'driver';
  email: string;
  expiresAt: number;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;

    // Check HMAC-SHA256 signature
    const hmacExpected = crypto.createHmac('sha256', SESSION_SECRET).update(base64).digest('base64url');
    let isValid = false;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(hmacExpected);
    if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      isValid = true;
    } else {
      // Legacy fallback check for seamless migration
      const legacyExpected = Buffer.from(`${base64}:${SESSION_SECRET}`).toString('base64');
      if (signature === legacyExpected) {
        isValid = true;
      }
    }

    if (!isValid) return null;

    // Decode base64 or base64url payload
    const jsonStr = Buffer.from(base64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;

  // 1. STRICT OWNER CONSOLE ROUTE GUARD (/admin/*)
  // Drivers CANNOT access the Owner panel under any circumstances
  if (pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== 'admin') {
      // Driver or non-admin attempting to access Owner Console: STRICT FORBIDDEN
      return NextResponse.redirect(new URL('/access-restricted', request.url));
    }
  }

  // 2. STRICT ADMIN API ROUTE GUARD (/api/admin/*)
  // Notifications route handles its own driver scoping; all other /api/admin/* are owner-only
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/notifications')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Owner privileges required. Driver accounts cannot access Owner APIs.' },
        { status: 403 }
      );
    }
  }

  // 3. BACKUP ROUTE GUARD (/api/backup/*)
  // Backups are strictly exclusive to Fleet Owner Admin
  if (pathname.startsWith('/api/backup')) {
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Backups can only be generated or downloaded by the Fleet Owner.' },
        { status: 403 }
      );
    }
  }

  // 4. STRICT DRIVER PORTAL ROUTE GUARD (/driver/*)
  // Fleet Owner CANNOT access the Driver Portal (Bidirectional Role Isolation)
  if (pathname.startsWith('/driver')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== 'driver') {
      // Owner (Admin) attempting to access Driver Portal: Redirect immediately to Owner Console
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 5. STRICT DRIVER API ROUTE GUARD (/api/driver/*)
  // Owner accounts cannot call driver endpoints
  if (pathname.startsWith('/api/driver')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'driver') {
      return NextResponse.json(
        { error: 'Forbidden: Driver privileges required. Fleet Owner accounts cannot invoke driver operational APIs.' },
        { status: 403 }
      );
    }
  }

  // 6. LOGIN PAGE AUTO-REDIRECT
  if (pathname === '/login') {
    if (session) {
      if (session.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/driver/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/driver/:path*',
    '/api/admin/:path*',
    '/api/driver/:path*',
    '/api/backup/:path*',
    '/login',
  ],
};
