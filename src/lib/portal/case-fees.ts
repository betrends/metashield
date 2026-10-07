// Recovery case pricing — real price list, by the account's follower
// count at the time of the case (not by issue type; every issue costs
// the same at a given follower tier). Source: BETREND DIGITALS' official
// "Disabled Account Recovery" price sheet.

export type FollowerRange =
  | "0-500"
  | "500-1000"
  | "1000-5000"
  | "5000-10000"
  | "10000-15000"
  | "15000-20000"
  | "20000-25000"
  | "25000-30000"
  | "30000-35000"
  | "35000-40000"
  | "40000-45000"
  | "45000-50000"
  | "50000+";

export const FOLLOWER_RANGES: { value: FollowerRange; label: string; feeKobo: number }[] = [
  { value: "0-500", label: "0 – 500 followers", feeKobo: 100_000_00 },
  { value: "500-1000", label: "500 – 1,000 followers", feeKobo: 120_000_00 },
  { value: "1000-5000", label: "1,000 – 5,000 followers", feeKobo: 140_000_00 },
  { value: "5000-10000", label: "5,000 – 10,000 followers", feeKobo: 160_000_00 },
  { value: "10000-15000", label: "10,000 – 15,000 followers", feeKobo: 175_000_00 },
  { value: "15000-20000", label: "15,000 – 20,000 followers", feeKobo: 185_000_00 },
  { value: "20000-25000", label: "20,000 – 25,000 followers", feeKobo: 200_000_00 },
  { value: "25000-30000", label: "25,000 – 30,000 followers", feeKobo: 220_000_00 },
  { value: "30000-35000", label: "30,000 – 35,000 followers", feeKobo: 250_000_00 },
  { value: "35000-40000", label: "35,000 – 40,000 followers", feeKobo: 265_000_00 },
  { value: "40000-45000", label: "40,000 – 45,000 followers", feeKobo: 285_000_00 },
  { value: "45000-50000", label: "45,000 – 50,000 followers", feeKobo: 300_000_00 },
  { value: "50000+", label: "50,000+ followers", feeKobo: 500_000_00 },
];

const DEFAULT_RANGE = FOLLOWER_RANGES[0];

export function getFollowerRangeFeeKobo(range: string): number {
  return FOLLOWER_RANGES.find((r) => r.value === range)?.feeKobo ?? DEFAULT_RANGE.feeKobo;
}

export function getFollowerRangeLabel(range: string | null | undefined): string {
  return FOLLOWER_RANGES.find((r) => r.value === range)?.label ?? "Not specified";
}

export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}
