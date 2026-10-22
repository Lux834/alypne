import { getDatabase } from "@/lib/mongodb";

type RateLimitRecord = {
  _id: string;
  hits: number;
  expiresAt: Date;
};

export async function enforceRateLimit(
  subject: string,
  action: string,
  limit: number,
  periodMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / periodMs);
  const windowEnd = (windowStart + 1) * periodMs;
  const bucket = `${action}:${subject}:${windowStart}`;
  const db = await getDatabase();
  let result: RateLimitRecord | null;
  try {
    result = await db.collection<RateLimitRecord>("rate_limits").findOneAndUpdate(
      { _id: bucket },
      {
        $inc: { hits: 1 },
        $setOnInsert: { expiresAt: new Date(windowEnd + periodMs) },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) throw error;
    result = await db.collection<RateLimitRecord>("rate_limits").findOneAndUpdate(
      { _id: bucket },
      { $inc: { hits: 1 } },
      { returnDocument: "after" },
    );
  }

  return {
    allowed: (result?.hits ?? limit + 1) <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
  };
}
