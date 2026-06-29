export interface EmailValidationResult {
  isValid: boolean;
  normalized: string | null;
  reason?: string;
}

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_TEXT_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function normalizeEmailAddress(value: string | null | undefined): EmailValidationResult {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return { isValid: false, normalized: null, reason: "Geen e-mailadres" };
  }
  if (normalized.length > 254 || !SIMPLE_EMAIL_RE.test(normalized)) {
    return { isValid: false, normalized: null, reason: "Geen geldig e-mailadres" };
  }
  return { isValid: true, normalized };
}

export function maskEmailAddress(value: string | null | undefined): string {
  const normalized = normalizeEmailAddress(value).normalized ?? value?.trim() ?? "";
  if (!normalized) return "";

  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "***";

  const visibleLocal = local.length <= 2 ? local[0] ?? "*" : local.slice(0, 2);
  const domainParts = domain.split(".");
  const tld = domainParts.length > 1 ? domainParts.at(-1) : "";
  const domainName = domainParts[0] ?? "";
  const visibleDomain = domainName ? domainName[0] : "*";

  return `${visibleLocal}***@${visibleDomain}***${tld ? `.${tld}` : ""}`;
}

export function maskEmailAddressesInText(text: string): string {
  return text.replace(EMAIL_IN_TEXT_RE, (match) => maskEmailAddress(match));
}
