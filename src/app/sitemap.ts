import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const routes: MetadataRoute.Sitemap = [
    "",
    "/campaigns",
    "/how-it-works",
    "/for-clippers",
    "/for-studios",
    "/tools/clipping-calculator",
    "/games",
    "/guides",
    "/faq",
    "/contact",
    "/privacy",
    "/tos",
    "/data-deletion",
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path ? 0.7 : 1 }));
  return routes.concat(guides.map(({ slug }) => ({
    url: `${base}/guides/${slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  })));
}
