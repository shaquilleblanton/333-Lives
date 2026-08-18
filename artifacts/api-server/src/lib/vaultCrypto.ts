/**
 * AES-256-GCM encryption/decryption for vault files at rest.
 *
 * Stored format: [IV (12 bytes)] [Auth Tag (16 bytes)] [Ciphertext]
 * Key is derived from SESSION_SECRET via scrypt so it never appears in code.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT = Buffer.from("333lives-vault-encryption-v1", "utf8");

let _cachedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not set — cannot encrypt vault files");
  _cachedKey = scryptSync(secret, SALT, KEY_LENGTH) as Buffer;
  return _cachedKey;
}

/**
 * Encrypt plaintext Buffer. Returns a Buffer with:
 *   [12-byte IV][16-byte GCM auth tag][ciphertext]
 */
export function encryptBuffer(plaintext: Buffer): Buffer {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a Buffer previously produced by encryptBuffer.
 * Throws if the auth tag doesn't match (i.e. the data is corrupted or tampered).
 */
export function decryptBuffer(ciphertext: Buffer): Buffer {
  const key = getDerivedKey();
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const authTag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = ciphertext.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
