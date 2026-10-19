import "server-only";
import Razorpay from "razorpay";
import { validatePaymentVerification, validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { env } from "@/lib/env";

let instance: Razorpay | null = null;

export function razorpay() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new Error("Razorpay keys are not set (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET).");
  }
  instance ??= new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  return instance;
}

/** Checks the signature Razorpay Checkout returns after a successful payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return validatePaymentVerification({ order_id: orderId, payment_id: paymentId }, signature, env.razorpayKeySecret);
}

export function verifyWebhook(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return validateWebhookSignature(body, signature, secret);
}

export const isTestMode = () => env.razorpayKeyId.startsWith("rzp_test_");
