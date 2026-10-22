"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/Brand";

const links = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-clippers", label: "For creators" },
  { href: "/for-studios", label: "For studios" },
  { href: "/tools/clipping-calculator", label: "Calculator" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Brand />
      <nav className={`site-nav${open ? " is-open" : ""}`} aria-label="Main navigation">
        {links.map((link) => (
          <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="button button-plain" href="/sign-in">Sign in</Link>
        <Link className="button button-primary" href="/campaigns">Explore campaigns</Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
    </header>
  );
}
