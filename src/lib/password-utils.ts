import { randomBytes, createHash } from "crypto";

/**
 * Hash password dengan SHA-256 + salt.
 * Format: base64(salt):base64(hash)
 * Kompatibel dengan ValidationUtils.kt di Android.
 *
 * @param plainPassword - Password plaintext
 * @returns string dalam format "base64(salt):base64(hash)"
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = createHash("sha256")
    .update(salt)
    .update(plainPassword)
    .digest();
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

/**
 * Verifikasi password dengan hash yang tersimpan.
 *
 * @param plainPassword - Password plaintext yang dimasukkan user
 * @param storedHash - Hash yang tersimpan (format: base64(salt):base64(hash))
 * @returns boolean - true jika cocok
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const hash = createHash("sha256")
    .update(salt)
    .update(plainPassword)
    .digest();

  return hash.toString("base64") === hashB64;
}
