import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "alypne_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type SessionIdentity = {
  discordId: string;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("Set SESSION_SECRET to a random value of at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(discordId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(discordId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { discordId: payload.sub };
  } catch {
    return null;
  }
}

export async function getSessionDiscordId(): Promise<string | null> {
  const identity = await getSessionIdentity();
  return identity?.discordId ?? null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
