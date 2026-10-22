import { MongoClient, type Db } from "mongodb";

declare global {
  var alypneMongoClientPromise: Promise<MongoClient> | undefined;
  var alypneMongoIndexesPromise: Promise<void> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB is not configured. Set MONGODB_URI.");

  if (!global.alypneMongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    global.alypneMongoClientPromise = client.connect();
  }

  let client: MongoClient;
  try {
    client = await global.alypneMongoClientPromise;
  } catch (error) {
    global.alypneMongoClientPromise = undefined;
    throw error;
  }
  return client;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DATABASE || "alypne_clips");

  if (!global.alypneMongoIndexesPromise) {
    global.alypneMongoIndexesPromise = Promise.all([
      db.collection("users").createIndex({ discordId: 1 }, { unique: true, name: "users_discord_id_unique" }),
      db.collection("discord_oauth_tokens").createIndex({ discordId: 1 }, { unique: true, name: "discord_tokens_by_user_unique" }),
      db.collection("campaigns").createIndex({ slug: 1 }, { unique: true, name: "campaigns_slug_unique" }),
      db.collection("campaigns").createIndex(
        { status: 1, visibility: 1, startsAt: 1, endsAt: 1, budgetRemaining: 1 },
        { name: "campaigns_public_discovery" },
      ),
      db.collection("campaigns").createIndex({ studioId: 1, createdAt: -1 }, { name: "campaigns_by_studio" }),
      db.collection("submissions").createIndex(
        { campaignSlug: 1, canonicalUrl: 1 },
        { unique: true, name: "submissions_campaign_video_unique" },
      ),
      db.collection("submissions").createIndex(
        { creatorDiscordId: 1, submittedAt: -1 },
        { name: "submissions_by_creator" },
      ),
      db.collection("submissions").createIndex(
        { studioId: 1, status: 1, submittedAt: -1 },
        { name: "submissions_by_studio" },
      ),
      db.collection("rate_limits").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "rate_limits_expiry" },
      ),
      db.collection("notifications").createIndex(
        { eventKey: 1 },
        { unique: true, name: "notifications_event_unique" },
      ),
      db.collection("notifications").createIndex(
        { targetDiscordId: 1, createdAt: -1 },
        { name: "notifications_by_user" },
      ),
      db.collection("notifications").createIndex(
        { targetDiscordId: 1, readAt: 1 },
        { name: "notifications_unread_by_user" },
      ),
      db.collection("audit_logs").createIndex(
        { entityType: 1, entityId: 1, createdAt: -1 },
        { name: "audit_by_entity" },
      ),
      db.collection("studio_invites").createIndex(
        { tokenHash: 1 },
        { unique: true, name: "studio_invites_token_unique" },
      ),
      db.collection("studio_invites").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "studio_invites_expiry" },
      ),
      db.collection("studio_invites").createIndex(
        { studioId: 1, expiresAt: 1 },
        { name: "studio_invites_by_workspace" },
      ),
      db.collection("support_tickets").createIndex(
        { ticketId: 1 },
        { unique: true, name: "support_tickets_id_unique" },
      ),
      db.collection("support_tickets").createIndex(
        { targetDiscordId: 1, updatedAt: -1 },
        { name: "support_tickets_by_user" },
      ),
    ]).then(() => undefined);
  }
  try {
    await global.alypneMongoIndexesPromise;
  } catch (error) {
    global.alypneMongoIndexesPromise = undefined;
    throw error;
  }
  return db;
}
