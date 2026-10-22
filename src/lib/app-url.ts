export function isSecureOrLocalUrl(url: URL) {
  if (url.protocol === "https:") return true;
  return url.protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export function appUrl(path: string) {
  const configured = process.env.APP_URL || "http://localhost:3000";
  const base = new URL(configured);
  if (process.env.NODE_ENV === "production" && !isSecureOrLocalUrl(base)) {
    throw new Error("APP_URL must use HTTPS in production, except for local loopback development.");
  }
  return new URL(path, base);
}
