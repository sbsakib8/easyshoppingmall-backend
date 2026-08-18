import { Request, Response, NextFunction } from "express";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY =
  process.env.FRONTEND_ENCRYPTION_KEY || "easyshop-frontend-secret-key-2024";

function decryptValue(cipherText: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch {
    return null;
  }
}

function isEncryptedString(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith("U2FsdGVkX1");
}

function decryptObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (typeof val === "string" && isEncryptedString(val)) {
      const decrypted = decryptValue(val);
      if (decrypted !== null) {
        try {
          result[key] = JSON.parse(decrypted);
        } catch {
          result[key] = decrypted;
        }
      } else {
        result[key] = val;
      }
    } else if (typeof val === "object" && val !== null) {
      result[key] = decryptObject(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

export const decryptBody = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = decryptObject(req.body);
    }
    next();
  } catch {
    next();
  }
};
