import mongoose from "mongoose";

export const auditActions = [
  "settings.updated",
  "finding.dismissed",
  "member.invited",
  "member.role_changed",
  "member.removed",
  "provider.changed",
  "repo.connected",
  "repo.disconnected",
  "suppression.removed",
  "review.retried",
  "failed_review.dismissed",
  "suggestion.posted",
];

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
      immutable: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    action: {
      type: String,
      enum: auditActions,
      required: true,
      immutable: true,
      index: true,
    },
    targetType: { type: String, required: true, immutable: true },
    targetId: { type: String, required: true, immutable: true },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      immutable: true,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      immutable: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
