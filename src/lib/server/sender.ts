// The "From" of every email. RESEND_FROM_EMAIL may be a bare address
// (noreply@mail.metashield.online): inboxes then show "noreply" as the
// sender and an "N" picture. Always send as "MetaShield <address>" so
// people see MetaShield and an "M". A value that already has a name
// (Name <address>) is used as it is — unless that name is just
// "noreply"/"no-reply", which is replaced too.

const SENDER_NAME = "MetaShield";

export function withSenderName(raw: string | undefined | null): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const named = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (named) {
    const name = named[1].trim();
    if (name && !/^no[-_.]?reply$/i.test(name)) return value;
    return `${SENDER_NAME} <${named[2].trim()}>`;
  }
  return `${SENDER_NAME} <${value}>`;
}

// RESEND_FROM_EMAIL with the MetaShield name, or Resend's test sender.
export function senderFrom(): string {
  return withSenderName(process.env.RESEND_FROM_EMAIL) ?? `${SENDER_NAME} <onboarding@resend.dev>`;
}
