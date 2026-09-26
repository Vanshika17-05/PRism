import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { User } from "../models/User.model.js";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(80).optional()
});
const mockUsers = [{ _id: "mock-demo-user", email: "demo@prism.dev", name: "Demo Engineer", password: "prism-demo-2026" }];

function publicUser(user) { return { _id: String(user._id), email: user.email, name: user.name }; }
function issueToken(user) { return jwt.sign(publicUser(user), env.JWT_SECRET, { expiresIn: "7d" }); }

export async function register(req, res) {
  const input = credentialsSchema.extend({ name: z.string().min(2).max(80) }).parse(req.body);
  if (env.USE_MOCKS) {
    if (mockUsers.some((user) => user.email === input.email)) return res.status(409).json({ error: "Email is already registered" });
    const user = { _id: `mock-${Date.now()}`, email: input.email, name: input.name, password: input.password };
    mockUsers.push(user);
    return res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  }
  if (await User.exists({ email: input.email })) return res.status(409).json({ error: "Email is already registered" });
  const user = await User.create({ email: input.email, name: input.name, passwordHash: await bcrypt.hash(input.password, 12) });
  return res.status(201).json({ user: publicUser(user), token: issueToken(user) });
}

export async function login(req, res) {
  const input = credentialsSchema.parse(req.body);
  const user = env.USE_MOCKS ? mockUsers.find((item) => item.email === input.email) : await User.findOne({ email: input.email });
  const valid = user && (env.USE_MOCKS ? user.password === input.password : await bcrypt.compare(input.password, user.passwordHash));
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });
  return res.json({ user: publicUser(user), token: issueToken(user) });
}

export function logout(_req, res) { return res.status(204).end(); }
export function me(req, res) { return res.json({ user: req.user }); }
