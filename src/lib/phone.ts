const E164_RE = /^\+[1-9]\d{7,14}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  reason?: string;
}

export function normalizePhoneNumber(value: string | null | undefined): PhoneValidationResult {
  const raw = value?.trim();
  if (!raw) {
    return { isValid: false, normalized: null, reason: "Geen telefoonnummer" };
  }

  let compact = raw.replace(/[\s().-]/g, "");

  if (compact.startsWith("00")) {
    compact = `+${compact.slice(2)}`;
  } else if (compact.startsWith("+")) {
    // Already international.
  } else if (compact.startsWith("06") && compact.length === 10) {
    compact = `+31${compact.slice(1)}`;
  } else if (compact.startsWith("6") && compact.length === 9) {
    compact = `+31${compact}`;
  } else if (compact.startsWith("31")) {
    compact = `+${compact}`;
  } else if (/^0[1-9]\d{7,12}$/.test(compact)) {
    compact = `+31${compact.slice(1)}`;
  }

  if (!/^\+\d+$/.test(compact)) {
    return { isValid: false, normalized: null, reason: "Telefoonnummer moet internationaal formaat hebben" };
  }

  if (!E164_RE.test(compact)) {
    return { isValid: false, normalized: null, reason: "Geen geldig telefoonnummer" };
  }

  return { isValid: true, normalized: compact };
}

export function maskPhoneNumber(value: string | null | undefined): string {
  const normalized = normalizePhoneNumber(value).normalized ?? value?.replace(/\D/g, "") ?? "";
  if (!normalized) return "";
  if (normalized.length <= 5) return "***";

  const start = normalized.startsWith("+") ? normalized.slice(0, 3) : normalized.slice(0, 2);
  const end = normalized.slice(-2);
  return `${start}${"*".repeat(Math.max(3, normalized.length - start.length - end.length))}${end}`;
}

export function maskPhoneNumbersInText(value: string): string {
  return value.replace(/\+?[0-9][0-9\s().-]{6,}[0-9]/g, (match) => maskPhoneNumber(match));
}
