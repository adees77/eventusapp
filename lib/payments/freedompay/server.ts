import "server-only";
import { createFreedomPay, type FreedomPay } from "./api";

/** FreedomPay client from env (server only). Keys: see .env.example → FREEDOMPAY_* */
export function isFreedomPayConfigured(): boolean {
  return Boolean(process.env.FREEDOMPAY_MERCHANT_ID && process.env.FREEDOMPAY_SECRET_KEY);
}

let client: FreedomPay | undefined;

export function freedomPay(): FreedomPay {
  if (!isFreedomPayConfigured()) throw new Error("FreedomPay is not configured (FREEDOMPAY_MERCHANT_ID / FREEDOMPAY_SECRET_KEY)");
  client ??= createFreedomPay({
    merchantId: process.env.FREEDOMPAY_MERCHANT_ID!,
    secretKey: process.env.FREEDOMPAY_SECRET_KEY!,
    apiUrl: process.env.FREEDOMPAY_API_URL || "https://api.freedompay.kg",
    testing: process.env.FREEDOMPAY_TESTING === "1",
  });
  return client;
}
