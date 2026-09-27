import { env } from "../config/env.js";
import { Organization } from "../models/Organization.model.js";
import { Repository } from "../models/Repository.model.js";
import { Review } from "../models/Review.model.js";
import { mockOrganizations } from "../data/mockOrganizations.js";
import { mockRepositories, mockReviews } from "../data/mockData.js";

const rank = { member: 1, admin: 2, owner: 3 };

async function resourceOrganizationId(req, resource) {
  if (resource === "organization") return req.params.id;
  if (resource === "repo") {
    const repo = env.USE_MOCKS ? mockRepositories.find((item) => item._id === req.params.id) : await Repository.findById(req.params.id).select("organizationId").lean();
    return repo?.organizationId?.toString();
  }
  if (resource === "review") {
    const review = env.USE_MOCKS ? mockReviews.find((item) => item._id === req.params.id) : await Review.findById(req.params.id).populate("repository", "organizationId").lean();
    return review?.repository?.organizationId?.toString();
  }
  return req.get("x-organization-id") || null;
}

export function roleMiddleware(minRole = "member", resource = "header") {
  return async (req, res, next) => {
    let organizationId = await resourceOrganizationId(req, resource);
    if (env.USE_MOCKS) {
      const candidates = mockOrganizations.filter((org) => org.members.some((member) => String(member.userId) === String(req.user._id)));
      const organization = candidates.find((org) => org._id === organizationId) || (!organizationId ? candidates[0] : null);
      const member = organization?.members.find((item) => String(item.userId) === String(req.user._id));
      if (!member) return res.status(403).json({ error: "Organization membership required" });
      if (rank[member.role] < rank[minRole]) return res.status(403).json({ error: `${minRole} role required`, code: "INSUFFICIENT_ROLE" });
      req.organization = organization;
      req.organizationRole = member.role;
      return next();
    }
    let organization = organizationId ? await Organization.findById(organizationId) : await Organization.findOne({ "members.userId": req.user._id });
    const member = organization?.members.find((item) => String(item.userId) === String(req.user._id));
    if (!member) return res.status(403).json({ error: "Organization membership required" });
    if (rank[member.role] < rank[minRole]) return res.status(403).json({ error: `${minRole} role required`, code: "INSUFFICIENT_ROLE" });
    req.organization = organization;
    req.organizationRole = member.role;
    next();
  };
}
