import path from "node:path";
import { z } from "zod";
import { env } from "../config/env.js";
import { mockProfileFor, mockUserProfiles } from "../data/mockUsers.js";
import { User } from "../models/User.model.js";
import {
  putStoredObject,
  readStoredObject,
} from "../services/storage.service.js";

const profileSchema = z
  .object({
    displayName: z.string().trim().max(50).optional(),
    avatarUrl: z
      .union([
        z.literal(""),
        z.string().url(),
        z.string().regex(/^\/api\/users\/avatar\/[a-zA-Z0-9_-]+$/),
      ])
      .optional(),
  })
  .refine(
    (input) => Object.keys(input).length > 0,
    "No profile changes supplied",
  );

function profileResponse(user) {
  return {
    _id: String(user._id),
    githubId: user.githubId,
    username: user.username,
    displayName: user.displayName || "",
    name: user.name,
    avatarUrl: user.avatarUrl || user.githubAvatarUrl || "",
    githubAvatarUrl: user.githubAvatarUrl || user.avatarUrl || "",
    githubUrl: user.githubUrl,
    email: user.email || "",
  };
}

export async function updateMe(req, res) {
  const input = profileSchema.parse(req.body);
  if (env.USE_MOCKS) {
    const current = mockProfileFor(req.user);
    const next = { ...current, ...input };
    if (input.avatarUrl === "") {
      next.avatarUrl = next.githubAvatarUrl || "";
      next.avatarStorageKey = "";
    }
    mockUserProfiles.set(String(req.user._id), next);
    return res.json({ user: profileResponse(next) });
  }
  const update = { ...input };
  if (input.avatarUrl === "") {
    const existing = await User.findById(req.user._id).select(
      "githubAvatarUrl",
    );
    update.avatarUrl = existing.githubAvatarUrl || "";
    update.avatarStorageKey = "";
  }
  const user = await User.findByIdAndUpdate(req.user._id, update, {
    new: true,
    runValidators: true,
  });
  return res.json({ user: profileResponse(user) });
}

export async function uploadAvatar(req, res) {
  if (!req.file)
    return res.status(400).json({ error: "Avatar image is required" });
  const bytes = req.file.buffer;
  const validSignature =
    (req.file.mimetype === "image/jpeg" &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff) ||
    (req.file.mimetype === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
    (req.file.mimetype === "image/webp" &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!validSignature)
    return res
      .status(400)
      .json({ error: "Uploaded file is not a valid image" });
  const extension = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }[req.file.mimetype];
  const key = await putStoredObject(
    `avatars/${req.user._id}/${Date.now()}${extension}`,
    req.file.buffer,
    req.file.mimetype,
  );
  const avatarUrl = `/api/users/avatar/${req.user._id}`;
  if (env.USE_MOCKS) {
    const next = {
      ...mockProfileFor(req.user),
      avatarUrl,
      avatarStorageKey: key,
    };
    mockUserProfiles.set(String(req.user._id), next);
  } else
    await User.findByIdAndUpdate(req.user._id, {
      avatarUrl,
      avatarStorageKey: key,
    });
  return res.status(201).json({ avatarUrl });
}

export async function avatarFile(req, res) {
  const profile = env.USE_MOCKS
    ? mockUserProfiles.get(String(req.params.userId))
    : await User.findById(req.params.userId).select("+avatarStorageKey").lean();
  if (!profile?.avatarStorageKey)
    return res.status(404).json({ error: "Custom avatar not found" });
  const body = await readStoredObject(profile.avatarStorageKey);
  const extension = path.extname(profile.avatarStorageKey).toLowerCase();
  const type = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  }[extension];
  return res.set("Cache-Control", "private, max-age=300").type(type).send(body);
}

export { profileResponse };
