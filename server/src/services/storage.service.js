import fs from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

let client;
const safeKey = (key) => key.replace(/[^a-zA-Z0-9._/-]/g, "_");
function s3() {
  client ||= new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export async function putStoredObject(key, body, contentType) {
  const clean = safeKey(key);
  if (env.USE_S3) {
    await s3().send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: clean,
        Body: body,
        ContentType: contentType,
      }),
    );
  } else {
    const target = path.resolve(env.LOCAL_STORAGE_DIR, clean);
    if (!target.startsWith(path.resolve(env.LOCAL_STORAGE_DIR)))
      throw new Error("Invalid storage key");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }
  return clean;
}

export async function storedObjectUrl(key) {
  if (env.USE_S3)
    return getSignedUrl(
      s3(),
      new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
      { expiresIn: 300 },
    );
  return `/api/storage/download?key=${encodeURIComponent(key)}`;
}

export async function readLocalObject(key) {
  const target = path.resolve(env.LOCAL_STORAGE_DIR, safeKey(key));
  if (!target.startsWith(path.resolve(env.LOCAL_STORAGE_DIR)))
    throw new Error("Invalid storage key");
  return fs.readFile(target);
}
