import { siInstagram, siTiktok, siYoutube } from "simple-icons";

const platformIcons = {
  TikTok: siTiktok,
  YouTube: siYoutube,
  Instagram: siInstagram,
} as const;

export function PlatformBrandIcon({ platform, className = "" }: { platform: keyof typeof platformIcons; className?: string }) {
  const icon = platformIcons[platform];
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d={icon.path} /></svg>;
}
