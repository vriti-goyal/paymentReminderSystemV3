import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// Ensure we have a 256-bit (32-byte) key.
// Fallback to deriving from NEXTAUTH_SECRET if ENCRYPTION_KEY is not defined.
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-secret-key-at-least-32-chars-long";
  // Create a 256-bit key by hashing the secret
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts clear text using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Combine IV and encrypted text with a colon delimiter
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts cipher text using AES-256-CBC
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const key = getEncryptionKey();
    const [ivHex, encryptedHex] = encryptedText.split(":");
    if (!ivHex || !encryptedHex) return "";
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return "";
  }
}
