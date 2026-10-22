import { describe, expect, it } from "vitest";
import { estimateCreatorEarnings, estimateStudioCampaign } from "@/lib/calculator";

describe("estimateCreatorEarnings", () => {
  it("calculates gross, fee, and net earnings", () => {
    expect(estimateCreatorEarnings({
      eligibleViews: 125_000,
      ratePerThousand: 3,
      feePercent: 10,
      clipCap: 500,
    })).toEqual({ gross: 375, fee: 37.5, net: 337.5 });
  });

  it("applies the per-clip cap before calculating fees", () => {
    expect(estimateCreatorEarnings({
      eligibleViews: 1_000_000,
      ratePerThousand: 5,
      feePercent: 8,
      clipCap: 200,
    })).toEqual({ gross: 200, fee: 16, net: 184 });
  });

  it("rejects negative, non-finite, and out-of-range inputs", () => {
    expect(() => estimateCreatorEarnings({
      eligibleViews: -1,
      ratePerThousand: 1,
      feePercent: 0,
      clipCap: 10,
    })).toThrow(RangeError);
    expect(() => estimateCreatorEarnings({
      eligibleViews: 1,
      ratePerThousand: Number.NaN,
      feePercent: 0,
      clipCap: 10,
    })).toThrow(RangeError);
    expect(() => estimateCreatorEarnings({
      eligibleViews: 1,
      ratePerThousand: 1,
      feePercent: 101,
      clipCap: 10,
    })).toThrow(RangeError);
  });

  it("estimates studio spend and remaining budget", () => {
    expect(estimateStudioCampaign({
      budget: 500,
      ratePerThousand: 2,
      feePercent: 10,
      estimatedClips: 10,
      averageViewsPerClip: 10_000,
    })).toEqual({
      estimatedViews: 100_000,
      creatorSpend: 200,
      estimatedFees: 20,
      totalSpend: 220,
      remainingBudget: 280,
    });
  });

  it("never reports a negative remaining budget", () => {
    expect(estimateStudioCampaign({
      budget: 25,
      ratePerThousand: 5,
      feePercent: 0,
      estimatedClips: 10,
      averageViewsPerClip: 100_000,
    }).remainingBudget).toBe(0);
  });
});
