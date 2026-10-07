// Illustrative case study format based on the service's engagement template.
// TODO before launch: replace with real, anonymized client outcomes —
// only publish results you can substantiate, and keep timelines honest.

export type CaseStudy = {
  id: string;
  platform: string;
  accountType: string;
  problem: string;
  issue: string;
  initialStatus: string;
  resolution: string;
  timeline: string;
  feedback: string;
};

export const caseStudies: CaseStudy[] = [
  {
    id: "BT-2201",
    platform: "Instagram",
    accountType: "Business",
    problem: "Instagram account disabled",
    issue: "Account integrity restriction",
    initialStatus: "Disabled",
    resolution: "Restored",
    timeline: "9 days",
    feedback:
      "“We'd already tried appealing twice ourselves. Having someone track the case and handle communication end to end made all the difference.”",
  },
  {
    id: "BT-2214",
    platform: "Meta Ads",
    accountType: "Advertiser",
    problem: "Ad account restricted mid-campaign",
    issue: "Policy compliance flag",
    initialStatus: "Restricted",
    resolution: "Restored",
    timeline: "12 days",
    feedback:
      "“Clear updates the whole way through. We knew exactly what stage the case was at without having to chase anyone.”",
  },
  {
    id: "BT-2233",
    platform: "Facebook",
    accountType: "Creator",
    problem: "Profile disabled after report",
    issue: "Identity verification required",
    initialStatus: "Disabled",
    resolution: "Restored",
    timeline: "6 days",
    feedback:
      "“Straightforward process — told me exactly what documents were needed and submitted everything correctly the first time.”",
  },
  {
    id: "BT-2247",
    platform: "Meta Business",
    accountType: "Agency",
    problem: "Business Manager restricted",
    issue: "Multiple linked ad account flags",
    initialStatus: "Restricted",
    resolution: "Restored",
    timeline: "19 days",
    feedback:
      "“A complex case with several ad accounts involved. Appreciated the regular status updates through the dashboard.”",
  },
];
