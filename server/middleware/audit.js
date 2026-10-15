import prisma from '../prisma.js';

export async function recordAuditLog({
  userId = null,
  userName = 'System',
  action,
  entity,
  entityId = null,
  details = '',
  req = null
}) {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
        ipAddress
      }
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}
