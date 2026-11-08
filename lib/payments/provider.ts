/**
 * Payment provider abstraction.
 *
 * DEMO: `DemoPaymentProvider` simulates a successful prepayment — no money
 * moves and no card data is collected anywhere in the app.
 *
 * To go live:
 *  1. Implement `PaymentProvider` for your PSP (a local bank acquiring, a
 *     wallet, or an international provider) in a new file.
 *  2. Create the payment on the SERVER (route handler / server action) with
 *     the secret key from env (PAYMENT_SECRET_KEY) — never in the browser.
 *  3. Redirect the user to the provider's hosted page (`redirectUrl`) so card
 *     data never touches our servers (PCI scope stays minimal).
 *  4. Confirm via the provider's webhook (route handler) and only then mark
 *     the booking prepaid — see markBookingPrepaid in lib/data/actions.ts.
 *  5. Return `getPaymentProvider()` → your provider.
 */

export type PaymentMethod = "card" | "qr" | "wallet";

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  currency: "KGS";
  method: PaymentMethod;
  description: string;
}

export interface PaymentResult {
  status: "succeeded" | "failed" | "redirect";
  reference: string;
  /** Hosted payment page for real providers */
  redirectUrl?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly isDemo: boolean;
  pay(input: CreatePaymentInput): Promise<PaymentResult>;
}

export const DemoPaymentProvider: PaymentProvider = {
  id: "demo",
  isDemo: true,
  async pay(input) {
    await new Promise((r) => setTimeout(r, 1400));
    return {
      status: "succeeded",
      reference: `DEMO-${input.bookingId.slice(-6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    };
  },
};

export function getPaymentProvider(): PaymentProvider {
  // TODO(payments): return the real provider when PAYMENT_PROVIDER is configured
  return DemoPaymentProvider;
}
