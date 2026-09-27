import { env } from "../config/env.js";
import { mockAuditLogs } from "../data/mockAuditLogs.js";
import { AuditLog } from "../models/AuditLog.model.js";

export async function logAudit({
  req,
  action,
  targetType,
  targetId,
  before = null,
  after = null,
  organizationId,
}) {
  const entry = {
    organizationId: String(organizationId || req.organization?._id),
    actorId: String(req.user._id || req.user.id),
    action,
    targetType,
    targetId: String(targetId),
    before,
    after,
    createdAt: new Date(),
  };
  if (env.USE_MOCKS) {
    const stored = {
      ...entry,
      _id: `audit-${Date.now()}-${mockAuditLogs.length}`,
    };
    mockAuditLogs.unshift(stored);
    return stored;
  }
  return AuditLog.create(entry);
}
