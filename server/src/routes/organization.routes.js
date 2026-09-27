import { Router } from "express";
import {
  acceptInvite,
  inviteMember,
  listOrganizations,
  organizationDetail,
  removeMember,
  updateMemberRole,
} from "../controllers/organization.controller.js";
import { roleMiddleware } from "../middleware/role.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listAuditLog } from "../controllers/audit.controller.js";
export const organizationRouter = Router();
organizationRouter.get("/", asyncHandler(listOrganizations));
organizationRouter.get(
  "/:id",
  roleMiddleware("member", "organization"),
  asyncHandler(organizationDetail),
);
organizationRouter.get(
  "/:id/audit-log",
  roleMiddleware("member", "organization"),
  asyncHandler(listAuditLog),
);
organizationRouter.post(
  "/:id/invite",
  roleMiddleware("admin", "organization"),
  asyncHandler(inviteMember),
);
organizationRouter.patch(
  "/:id/members/:userId",
  roleMiddleware("owner", "organization"),
  asyncHandler(updateMemberRole),
);
organizationRouter.delete(
  "/:id/members/:userId",
  roleMiddleware("owner", "organization"),
  asyncHandler(removeMember),
);
export const inviteRouter = Router();
inviteRouter.post("/:token/accept", asyncHandler(acceptInvite));
