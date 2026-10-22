export type CreatorEstimate = {
  gross: number;
  fee: number;
  net: number;
};

export type StudioEstimate = {
  estimatedViews: number;
  creatorSpend: number;
  estimatedFees: number;
  totalSpend: number;
  remainingBudget: number;
};

function validateNonNegative(input: Record<string, number>) {
  for (const [name, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite non-negative number.`);
    }
  }
}

export function estimateCreatorEarnings(input: {
  eligibleViews: number;
  ratePerThousand: number;
  feePercent: number;
  clipCap: number;
}): CreatorEstimate {
  const { eligibleViews, ratePerThousand, feePercent, clipCap } = input;
  validateNonNegative(input);
  if (feePercent > 100) throw new RangeError("feePercent cannot exceed 100.");

  const uncappedGross = (eligibleViews / 1000) * ratePerThousand;
  const gross = Math.round(Math.min(uncappedGross, clipCap) * 100) / 100;
  const fee = Math.round(gross * (feePercent / 100) * 100) / 100;

  return { gross, fee, net: Math.round((gross - fee) * 100) / 100 };
}

export function estimateStudioCampaign(input: {
  budget: number;
  ratePerThousand: number;
  feePercent: number;
  estimatedClips: number;
  averageViewsPerClip: number;
}): StudioEstimate {
  validateNonNegative(input);
  if (input.feePercent > 100) throw new RangeError("feePercent cannot exceed 100.");

  const estimatedViews = Math.round(input.estimatedClips * input.averageViewsPerClip);
  const creatorSpend = Math.round((estimatedViews / 1000) * input.ratePerThousand * 100) / 100;
  const estimatedFees = Math.round(creatorSpend * (input.feePercent / 100) * 100) / 100;
  const totalSpend = Math.round((creatorSpend + estimatedFees) * 100) / 100;
  const remainingBudget = Math.round(Math.max(input.budget - totalSpend, 0) * 100) / 100;
  return { estimatedViews, creatorSpend, estimatedFees, totalSpend, remainingBudget };
}
