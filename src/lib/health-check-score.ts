// Simple, transparent heuristic used to produce an *immediate, preliminary*
// self-assessment while a human reviews the full submission. This is
// intentionally not presented as an official platform score — see the
// disclaimer shown alongside every result in the UI.

export type DescribeAnswers = {
  accountAge: string;
  audienceSize: string;
  advertisingActivity: string;
  previousRestrictions: boolean;
  previousWarnings: boolean;
  previousDisabledAssociated: boolean;
  recentUsernameChange: boolean;
  recentActivityChange: boolean;
};

export type RiskLevel = "low" | "medium" | "high";

export type CategoryResult = {
  label: string;
  score: number;
  level: RiskLevel;
};

export type HealthCheckResult = {
  overall: number;
  overallLevel: RiskLevel;
  categories: CategoryResult[];
};

function levelForScore(score: number): RiskLevel {
  if (score >= 45) return "low";
  if (score >= 25) return "medium";
  return "high";
}

// Max score is 59 — accounts always have some residual exposure by nature of
// being on platforms that can act unilaterally.
function clamp(n: number) {
  return Math.max(0, Math.min(59, n));
}

export function scoreHealthCheck(answers: DescribeAnswers): HealthCheckResult {
  let status = 59;
  let policy = 59;
  let security = 59;
  let advertising = 59;
  let businessAssets = 59;

  if (answers.accountAge === "under-6-months") {
    status -= 15;
    businessAssets -= 10;
  } else if (answers.accountAge === "6-12-months") {
    status -= 5;
  }

  if (answers.previousRestrictions) {
    policy -= 25;
    status -= 10;
  }
  if (answers.previousWarnings) {
    policy -= 15;
  }
  if (answers.previousDisabledAssociated) {
    status -= 30;
    businessAssets -= 20;
  }
  if (answers.recentUsernameChange) {
    security -= 10;
    status -= 5;
  }
  if (answers.recentActivityChange) {
    policy -= 10;
    advertising -= 5;
  }
  if (answers.advertisingActivity === "regular") {
    advertising -= 10;
  } else if (answers.advertisingActivity === "occasional") {
    advertising -= 5;
  }
  if (answers.audienceSize === "100000-plus") {
    policy -= 5;
  }

  const categories: CategoryResult[] = [
    { label: "Account status", score: clamp(status), level: levelForScore(clamp(status)) },
    { label: "Policy compliance", score: clamp(policy), level: levelForScore(clamp(policy)) },
    { label: "Security", score: clamp(security), level: levelForScore(clamp(security)) },
    { label: "Advertising", score: clamp(advertising), level: levelForScore(clamp(advertising)) },
    {
      label: "Business assets",
      score: clamp(businessAssets),
      level: levelForScore(clamp(businessAssets)),
    },
  ];

  const overall = clamp(
    Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
  );

  return { overall, overallLevel: levelForScore(overall), categories };
}
