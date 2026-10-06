/* ============================================================
   Strict input validation for phone numbers and email addresses.

   The server (mail-service.cjs) enforces exactly these rules before any SMS or
   email is sent; this copy gives the same answer in the browser so the user
   sees a clear message BEFORE anything is dispatched.
   ============================================================ */

import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

const EMAIL_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** Exactly ONE plain address: no names, spaces, commas or header-injection characters. */
export function validateEmail(raw) {
  const email = String(raw == null ? "" : raw).trim();
  if (!email) return { ok: false, error: "Enter an email address." };
  if (email.length > 254 || /[\s,;<>()[\]\\":]/.test(email)) {
    return { ok: false, error: "Enter exactly one email address, e.g. name@example.com (no spaces, commas or display names)." };
  }
  const parts = email.split("@");
  if (parts.length !== 2) return { ok: false, error: `"${email}" is not a valid email address.` };
  const [local, domain] = parts;
  const labels = domain.split(".");
  const tld = labels[labels.length - 1] || "";
  const okLocal = local.length > 0 && local.length <= 64 && EMAIL_LOCAL.test(local);
  const okDomain =
    labels.length >= 2 &&
    labels.every((l) => EMAIL_LABEL.test(l)) &&
    (/^[A-Za-z]{2,}$/.test(tld) || /^xn--[A-Za-z0-9-]+$/.test(tld));
  if (!okLocal || !okDomain) return { ok: false, error: `"${email}" is not a valid email address.` };
  return { ok: true, email: `${local}@${domain.toLowerCase()}` };
}

/**
 * A valid, real-numbering-plan MOBILE number. Accepts +60123456789, 0123456789, 012-345 6789,
 * 0060123456789 … (numbers without a country code are read as Malaysian). Returns the E.164 form.
 */
export function validatePhone(raw) {
  const cleaned = String(raw == null ? "" : raw).trim().replace(/[\s().-]/g, "");
  if (!cleaned) return { ok: false, error: "Enter a phone number." };
  if (!/^\+?\d+$/.test(cleaned)) return { ok: false, error: "A phone number may contain only digits and a leading +." };
  const parsed = parsePhoneNumberFromString(cleaned, "MY");
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: `"${raw}" is not a valid phone number. Use a mobile number such as +60123456789.` };
  }
  const type = parsed.getType();
  if (type && type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") {
    return {
      ok: false,
      error: `${parsed.formatInternational()} is a ${type.toLowerCase().replace(/_/g, " ")} number and cannot receive SMS. Use a mobile number.`,
    };
  }
  return { ok: true, e164: parsed.number, country: parsed.country };
}
