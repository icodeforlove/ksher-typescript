import crypto from "crypto";

export const generateRandomString = (length: number): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const sortKeys = (data: Record<string, unknown>): Record<string, unknown> => {
  const sorted: Record<string, unknown> = {};
  Object.keys(data)
    .sort()
    .forEach((key) => {
      if (key === "sign") return;
      const value = data[key];
      if (typeof value === "string" || typeof value === "number") {
        sorted[key] = value;
      } else if (Buffer.isBuffer(value)) {
        sorted[key] = value.toString("utf-8");
      } else if (Array.isArray(value)) {
        sorted[key] = value.map((item) =>
          sortKeys(item as Record<string, unknown>)
        );
      } else if (value && typeof value === "object") {
        sorted[key] = Object.keys(value as Record<string, unknown>).sort();
      } else {
        sorted[key] = value;
      }
    });
  return sorted;
};

export const convertDataToString = (data: Record<string, unknown>): string => {
  const obj = sortKeys(data);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    let strVal: string | undefined;
    if (typeof value === "string") {
      strVal = value;
    } else if (Buffer.isBuffer(value)) {
      strVal = value.toString("utf-8");
    } else {
      strVal = JSON.stringify(value, null, 0) as string | undefined;
    }
    parts.push(`${key}=${strVal}`);
  }
  parts.sort();
  return parts.join("");
};

export const isPrivateKeyPem = (value: string): boolean => {
  try {
    const privateKey = crypto.createPrivateKey(value);
    return privateKey.asymmetricKeyType === "rsa";
  } catch {
    return false;
  }
};

export const isPublicKeyPem = (value: string): boolean => {
  try {
    const publicKey = crypto.createPublicKey(value);
    return publicKey.asymmetricKeyType === "rsa";
  } catch {
    return false;
  }
};

export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
