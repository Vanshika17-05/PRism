import { z } from "zod";
import { env } from "../config/env.js";
import { mockAuditLogs } from "../data/mockAuditLogs.js";
import { auditActions, AuditLog } from "../models/AuditLog.model.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  action: z.enum(auditActions).optional(),
});

export async function listAuditLog(req, res) {
  const { page, action } = querySchema.parse(req.query);
  const limit = 25;
  if (env.USE_MOCKS) {
    const filtered = mockAuditLogs.filter(
      (entry) =>
        entry.organizationId === String(req.organization._id) &&
        (!action || entry.action === action),
    );
    const items = filtered
      .slice((page - 1) * limit, page * limit)
      .map((entry) => ({
        ...entry,
        actorId: {
          _id: entry.actorId,
          username: req.user.username,
          name: req.user.name,
          avatarUrl: req.user.avatarUrl || "",
        },
      }));
    return res.json({
      items,
      actions: auditActions,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / limit)),
      },
    });
  }
  const filter = { organizationId: req.organization._id };
  if (action) filter.action = action;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "username name avatarUrl")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return res.json({
    items,
    actions: auditActions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
