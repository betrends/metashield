// Small pill flagging a case's payment status on the client's own
// dashboard — shown next to the stage badge, not instead of it. Renders
// nothing once paid, so paid-up cases don't carry a stale pill forward.
export function PaymentStatusBadge({
  status,
}: {
  status: "unpaid" | "pending_review" | "paid" | "failed";
}) {
  if (status === "paid") return null;

  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-risk-medium-bg px-2.5 py-1 text-[11px] font-semibold text-risk-medium">
        Receipt under review
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-[11px] font-semibold text-risk-high">
        Payment failed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-[11px] font-semibold text-risk-high">
      Payment required
    </span>
  );
}
