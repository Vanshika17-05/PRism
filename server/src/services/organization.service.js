import { Organization } from "../models/Organization.model.js";

export function personalWorkspaceSlug(username, githubId) {
  const base = `${username}-workspace`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${githubId}`;
}

export async function ensurePersonalOrganization(
  user,
  OrganizationModel = Organization,
) {
  return OrganizationModel.findOneAndUpdate(
    { ownerId: user._id },
    {
      $setOnInsert: {
        name: `${user.username}'s workspace`,
        slug: personalWorkspaceSlug(user.username, user.githubId),
        ownerId: user._id,
        members: [{ userId: user._id, role: "owner" }],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
