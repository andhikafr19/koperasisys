import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface AuditLogPayload {
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DISBURSE' | 'APPROVE' | 'REJECT';
  entityName: string;
  entityId?: string | null;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Record immutable audit log inside or outside a database transaction
 */
export async function createAuditLog(
  clientOrTx: Prisma.TransactionClient | typeof prisma,
  payload: AuditLogPayload
) {
  try {
    return await clientOrTx.auditLog.create({
      data: {
        userId: payload.userId || null,
        action: payload.action,
        entityName: payload.entityName,
        entityId: payload.entityId ? String(payload.entityId) : null,
        beforeData: payload.beforeData ? JSON.parse(JSON.stringify(payload.beforeData)) : undefined,
        afterData: payload.afterData ? JSON.parse(JSON.stringify(payload.afterData)) : undefined,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      },
    });
  } catch (err) {
    // We log error but don't fail the primary transaction if logging fails non-critically
    console.error('Failed to create audit log entry:', err);
    return null;
  }
}
