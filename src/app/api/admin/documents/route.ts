import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDatabase, saveDatabase, logAudit } from '@/lib/db';
import { VehicleDocument } from '@/types';
import { computeDocumentStatus } from '@/lib/accounting';
export { computeDocumentStatus };

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');

    const db = getDatabase();
    let docs = db.documents;
    if (vehicleId) docs = docs.filter((d) => d.vehicleId === vehicleId);

    const enrichedDocs = docs.map((d) => {
      const vehicle = db.vehicles.find((v) => v.id === d.vehicleId);
      const { status: calculatedStatus, daysRemaining } = computeDocumentStatus(d.expiryDate);

      // Keep DB status up-to-date
      if (d.status !== calculatedStatus && d.status !== 'renewal_pending') {
        d.status = calculatedStatus;
      }

      return {
        ...d,
        status: d.status === 'renewal_pending' ? 'renewal_pending' : calculatedStatus,
        daysRemaining,
        vehicleReg: vehicle?.regNumber || 'Unknown',
        vehicleName: vehicle?.name || '',
      };
    });

    let result = enrichedDocs;
    if (status) {
      result = enrichedDocs.filter((d) => d.status === status);
    }

    // Also include Driver DLs compliance summary
    const driverDLs = db.drivers.map((drv) => {
      const { status: dlStatus, daysRemaining } = computeDocumentStatus(drv.dlExpiryDate);
      return {
        id: `dl_${drv.id}`,
        driverId: drv.id,
        driverName: drv.fullName,
        driverPhone: drv.phone,
        docType: 'driving_licence' as const,
        docNumber: drv.dlNumber,
        expiryDate: drv.dlExpiryDate,
        status: dlStatus,
        daysRemaining,
      };
    });

    return NextResponse.json({
      documents: result,
      driverLicences: driverDLs,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch compliance documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { vehicleId, docType, docNumber, issueDate, expiryDate, issuingAuthority, renewalCost, notes } = body;

    if (!vehicleId || !docType || !docNumber || !expiryDate) {
      return NextResponse.json({ error: 'Vehicle, document type, number, and expiry date are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const vehicle = db.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    }

    const { status: calculatedStatus } = computeDocumentStatus(expiryDate);
    const now = new Date().toISOString();

    const newDoc: VehicleDocument = {
      id: `doc_${Date.now()}`,
      vehicleId,
      docType,
      docNumber: docNumber.trim().toUpperCase(),
      issueDate: issueDate || now.slice(0, 10),
      expiryDate,
      issuingAuthority: issuingAuthority?.trim() || 'RTO Transport Department',
      renewalCost: Number(renewalCost) || 0,
      reminderDays: [30, 15, 7, 0],
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    };

    db.documents.push(newDoc);

    logAudit(
      admin.id,
      admin.name,
      'admin',
      'ADD_DOCUMENT',
      'VehicleDocument',
      `Registered ${docType.toUpperCase()} (${newDoc.docNumber}) for ${vehicle.regNumber}. Expiry: ${expiryDate}`,
      newDoc.id
    );

    saveDatabase(db);
    return NextResponse.json({ success: true, document: newDoc });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 });
  }
}
