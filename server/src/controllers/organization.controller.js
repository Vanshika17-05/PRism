import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { Organization } from "../models/Organization.model.js";
import { Invite } from "../models/Invite.model.js";
import { User } from "../models/User.model.js";
import { mockInvites, mockOrganizations } from "../data/mockOrganizations.js";
import { logger } from "../utils/logger.js";
import { logAudit } from "../services/audit.service.js";

const inviteInput = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});
export async function listOrganizations(req, res) {
  if (env.USE_MOCKS)
    return res.json({
      organizations: mockOrganizations.filter((org) =>
        org.members.some((m) => String(m.userId) === String(req.user._id)),
      ),
    });
  const organizations = await Organization.find({
    "members.userId": req.user._id,
  })
    .populate(
      "members.userId",
      "username displayName name email avatarUrl githubAvatarUrl",
    )
    .lean();
  res.json({ organizations });
}
export async function organizationDetail(req, res) {
  if (env.USE_MOCKS)
    return res.json({
      organization: req.organization,
      invites: mockInvites.filter(
        (item) => item.organizationId === req.organization._id,
      ),
    });
  const organization = await Organization.findById(req.organization._id)
    .populate(
      "members.userId",
      "username displayName name email avatarUrl githubAvatarUrl",
    )
    .lean();
  const invites = await Invite.find({ organizationId: organization._id })
    .select("email role expiresAt createdAt")
    .lean();
  res.json({ organization, invites, role: req.organizationRole });
}
export async function inviteMember(req, res) {
  const input = inviteInput.parse(req.body);
  const invite = {
    organizationId: String(req.organization._id),
    ...input,
    token: crypto.randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  };
  const saved = env.USE_MOCKS
    ? (mockInvites.push({ ...invite, _id: `invite-${Date.now()}` }),
      mockInvites.at(-1))
    : await Invite.findOneAndUpdate(
        { organizationId: req.organization._id, email: input.email },
        invite,
        { upsert: true, new: true },
      );
  logger.info(
    {
      inviteLink: `${env.APP_URL}/invite/${saved.token}`,
      organizationId: req.organization._id,
    },
    "Organization invite created",
  );
  await logAudit({
    req,
    action: "member.invited",
    targetType: "invite",
    targetId: saved._id,
    after: { email: saved.email, role: saved.role },
  });
  res.status(201).json({
    invite: {
      email: saved.email,
      role: saved.role,
      expiresAt: saved.expiresAt,
    },
    inviteLink: `${env.APP_URL}/invite/${saved.token}`,
  });
}
export async function acceptInvite(req, res) {
  const invite = env.USE_MOCKS
    ? mockInvites.find((item) => item.token === req.params.token)
    : await Invite.findOne({
        token: req.params.token,
        expiresAt: { $gt: new Date() },
      });
  if (!invite)
    return res.status(404).json({ error: "Invite is invalid or expired" });
  const user = env.USE_MOCKS ? req.user : await User.findById(req.user._id);
  if (!user?.email || user.email.toLowerCase() !== invite.email.toLowerCase())
    return res
      .status(403)
      .json({ error: "Sign in with the invited email address" });
  if (env.USE_MOCKS) {
    const organization = mockOrganizations.find(
      (item) => item._id === String(invite.organizationId),
    );
    if (!organization)
      return res.status(404).json({ error: "Organization not found" });
    if (
      !organization.members.some(
        (member) => String(member.userId) === String(user._id),
      )
    )
      organization.members.push({
        userId: user._id,
        role: invite.role,
        joinedAt: new Date().toISOString(),
        user,
      });
    mockInvites.splice(mockInvites.indexOf(invite), 1);
  } else {
    await Organization.updateOne(
      { _id: invite.organizationId, "members.userId": { $ne: user._id } },
      { $push: { members: { userId: user._id, role: invite.role } } },
    );
    await invite.deleteOne();
  }
  res.json({ accepted: true, organizationId: invite.organizationId });
}
export async function updateMemberRole(req, res) {
  const input = z.object({ role: z.enum(["admin", "member"]) }).parse(req.body);
  if (String(req.params.userId) === String(req.organization.ownerId))
    return res.status(400).json({ error: "Owner role cannot be changed" });
  if (env.USE_MOCKS) {
    const member = req.organization.members.find(
      (item) => String(item.userId) === req.params.userId,
    );
    if (!member) return res.status(404).json({ error: "Member not found" });
    const before = { role: member.role };
    member.role = input.role;
    await logAudit({
      req,
      action: "member.role_changed",
      targetType: "user",
      targetId: req.params.userId,
      before,
      after: { role: input.role },
    });
  } else {
    const member = req.organization.members.find(
      (item) => String(item.userId) === req.params.userId,
    );
    if (!member) return res.status(404).json({ error: "Member not found" });
    const before = { role: member.role };
    await Organization.updateOne(
      { _id: req.organization._id, "members.userId": req.params.userId },
      { $set: { "members.$.role": input.role } },
    );
    await logAudit({
      req,
      action: "member.role_changed",
      targetType: "user",
      targetId: req.params.userId,
      before,
      after: { role: input.role },
    });
  }
  res.json({ updated: true });
}
export async function removeMember(req, res) {
  if (String(req.params.userId) === String(req.organization.ownerId))
    return res
      .status(400)
      .json({ error: "Organization owner cannot be removed" });
  const member = req.organization.members.find(
    (item) => String(item.userId) === req.params.userId,
  );
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (env.USE_MOCKS)
    req.organization.members = req.organization.members.filter(
      (item) => String(item.userId) !== req.params.userId,
    );
  else
    await Organization.updateOne(
      { _id: req.organization._id },
      { $pull: { members: { userId: req.params.userId } } },
    );
  await logAudit({
    req,
    action: "member.removed",
    targetType: "user",
    targetId: req.params.userId,
    before: { role: member.role },
  });
  res.json({ removed: true });
}
