import Link from "next/link";
import { Brand } from "@/components/Brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Brand />
        <nav className="footer-links" aria-label="Footer">
          <Link href="/campaigns">Campaigns</Link>
          <Link href="/for-clippers">Creators</Link>
          <Link href="/for-studios">Studios</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/tos">Terms</Link>
          <Link href="/data-deletion">Data deletion</Link>
        </nav>
      </div>
      <div className="footer-bottom">Support: <a href="mailto:support@alypne.app">support@alypne.app</a></div>
      <div className="footer-bottom">© {new Date().getFullYear()} Alypne. Built for creators and studios.</div>
    </footer>
  );
}
