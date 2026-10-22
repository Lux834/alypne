import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Alypne — Create clips. Earn from campaigns.",
    template: "%s | Alypne",
  },
  description:
    "Discover creator campaigns, publish clips, and track verified performance with Alypne.",
  openGraph: {
    title: "Alypne — Create clips. Earn from campaigns.",
    description:
      "A creator campaign platform built to connect studios and short-form creators.",
    siteName: "Alypne",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
