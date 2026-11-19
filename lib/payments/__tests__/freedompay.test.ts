import { describe, expect, it } from "vitest";
import { createFreedomPay, FreedomPayError } from "../freedompay/api";
import { fromForm, scriptOf, sign, toForm, verify, type FpParams } from "../freedompay/sign";
import { parseXml, xmlReply } from "../freedompay/xml";

const SECRET = "test_secret_key";

describe("FreedomPay signature", () => {
  it("matches the example from the docs", () => {
    const params = {
      pg_order_id: "order_1001",
      pg_merchant_id: "12345",
      pg_amount: "100",
      pg_currency: "KZT",
      pg_description: "Order #1001",
      pg_salt: "a1b2c3d4",
    };
    expect(sign("init_payment.php", params, SECRET)).toBe("b9ad75871668ca040f80f5f6b530e6ed");
  });

  it("ignores pg_sig, sorts nested params by name, verifies", () => {
    const p: FpParams = { b: "2", a: { y: "4", x: "3" }, list: [{ name: "n", count: "1" }], pg_sig: "zzz" };
    // sorted: a.x a.y b list[0].count list[0].name
    const want = sign("s", { a: { x: "3", y: "4" }, b: "2", list: [{ count: "1", name: "n" }] }, SECRET);
    expect(sign("s", p, SECRET)).toBe(want);
    expect(verify("s", { ...p, pg_sig: want }, SECRET)).toBe(true);
    expect(verify("s", { ...p, b: "3", pg_sig: want }, SECRET)).toBe(false);
    expect(verify("s", { ...p, pg_sig: undefined }, SECRET)).toBe(false);
  });

  it("script is the last path segment", () => {
    expect(scriptOf("https://api.freedompay.kg/init_payment.php")).toBe("init_payment.php");
    expect(scriptOf("https://www.eventusai.app/api/payments/freedompay/result?x=1")).toBe("result");
    expect(scriptOf("/cancel")).toBe("cancel");
  });

  it("form round trip keeps nesting", () => {
    const p: FpParams = { pg_amount: "10", pg_receipt_positions: [{ name: "Фото", count: "1", price: "10" }] };
    const form = toForm(p);
    expect(form.get("pg_receipt_positions[0][name]")).toBe("Фото");
    expect(fromForm(form.entries())).toEqual(p);
  });
});

describe("FreedomPay XML", () => {
  it("parses flat, nested, repeated, CDATA and entities", () => {
    const d = parseXml(`<?xml version="1.0" encoding="utf-8"?>
      <response><pg_status>ok</pg_status><pg_description><![CDATA[a <b>]]></pg_description>
      <pg_name>R&amp;D</pg_name><pg_list><pg_item>1</pg_item><pg_item>2</pg_item></pg_list><pg_empty/></response>`);
    expect(d).toEqual({ pg_status: "ok", pg_description: "a <b>", pg_name: "R&D", pg_list: { pg_item: ["1", "2"] }, pg_empty: "" });
  });

  it("reply escapes text", () => {
    expect(xmlReply("rejected", "a&b")).toContain("<pg_status>rejected</pg_status><pg_description>a&amp;b</pg_description>");
  });
});

describe("FreedomPay client", () => {
  const cfg = { merchantId: "555", secretKey: SECRET, apiUrl: "https://api.test/", testing: true };

  function fakeFetch(reply: (script: string, body: URLSearchParams) => FpParams | string, status = 200) {
    const calls: { url: string; body: URLSearchParams }[] = [];
    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = init!.body as URLSearchParams;
      calls.push({ url: String(url), body });
      const r = reply(scriptOf(String(url)), body);
      if (typeof r === "string") return new Response(r, { status });
      const signed = { ...r, pg_salt: "s1", pg_sig: "" };
      signed.pg_sig = sign(scriptOf(String(url)), signed, SECRET);
      const xml = Object.entries(signed).map(([k, v]) => `<${k}>${String(v)}</${k}>`).join("");
      return new Response(`<response>${xml}</response>`, { status });
    }) as typeof fetch;
    return { impl, calls };
  }

  it("init: sends a signed one-stage request, returns the redirect", async () => {
    const f = fakeFetch(() => ({ pg_status: "ok", pg_payment_id: "42", pg_redirect_url: "https://pay/42" }));
    const fp = createFreedomPay(cfg, f.impl);
    const r = await fp.initPayment({
      orderId: "pay_1",
      amount: 1500,
      currency: "KGS",
      description: "Предоплата",
      resultUrl: "https://x/api/payments/freedompay/result",
      successUrl: "https://x/ok",
      failureUrl: "https://x/fail",
    });
    expect(r).toEqual({ paymentId: "42", redirectUrl: "https://pay/42" });
    const { url, body } = f.calls[0];
    expect(url).toBe("https://api.test/init_payment.php");
    expect(body.get("pg_auto_clearing")).toBe("1");
    expect(body.get("pg_testing_mode")).toBe("1");
    expect(body.get("pg_merchant_id")).toBe("555");
    expect(body.has("pg_check_url")).toBe(false);
    expect(verify("init_payment.php", fromForm(body.entries()), SECRET)).toBe(true);
  });

  it("unsigned api error → FreedomPayError(api)", async () => {
    const f = fakeFetch(() => "<response><pg_status>error</pg_status><pg_error_code>9998</pg_error_code></response>");
    await expect(createFreedomPay(cfg, f.impl).capture("1")).rejects.toMatchObject({ kind: "api", code: "9998" });
  });

  it("bad signature, non-200 and non-XML are rejected", async () => {
    const bad = fakeFetch(() => "<response><pg_status>ok</pg_status><pg_sig>00000000000000000000000000000000</pg_sig></response>");
    await expect(createFreedomPay(cfg, bad.impl).cancel("1")).rejects.toMatchObject({ kind: "signature" });
    const down = fakeFetch(() => "oops", 502);
    await expect(createFreedomPay(cfg, down.impl).cancel("1")).rejects.toMatchObject({ kind: "transport" });
    const html = fakeFetch(() => "<!doctype html>");
    await expect(createFreedomPay(cfg, html.impl).cancel("1")).rejects.toBeInstanceOf(FreedomPayError);
  });

  it("signed failure on revoke → FreedomPayError(failure)", async () => {
    const f = fakeFetch(() => ({ pg_status: "error", pg_failure_code: "900811", pg_failure_description: "too much" }));
    await expect(createFreedomPay(cfg, f.impl).refund("1", 99)).rejects.toMatchObject({ kind: "failure", code: "900811" });
    expect(f.calls[0].body.get("pg_refund_amount")).toBe("99");
  });

  it("status maps amounts and flags", async () => {
    const f = fakeFetch(() => ({
      pg_status: "ok",
      pg_payment_id: "7",
      pg_payment_status: "success",
      pg_amount: "100",
      pg_captured: "1",
      pg_clearing_amount: "50",
      pg_refund_amount: "-20.00",
    }));
    const s = await createFreedomPay(cfg, f.impl).getStatus({ orderId: "pay_1" });
    expect(s).toMatchObject({ status: "success", captured: true, clearingAmount: 50, refundAmount: 20, amount: 100 });
    expect(f.calls[0].body.get("pg_order_id")).toBe("pay_1");
  });
});
