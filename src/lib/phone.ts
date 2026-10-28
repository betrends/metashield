// Phone helpers for the Call buttons. Numbers are dialled as typed (a
// Nigerian "080…" works from a Nigerian phone); only characters a phone
// can't dial are removed.

export function telHref(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
