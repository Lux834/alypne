"use client";

import { Activity, ArrowLeftRight, BadgeDollarSign, Bell, BriefcaseBusiness, Clapperboard, FileCheck2, Globe, HelpCircle, LayoutDashboard, LifeBuoy, Link2, LogOut, Menu, Settings, ShieldCheck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { SupportMessageModal } from "@/components/SupportMessageModal";
import { DashboardTutorial } from "@/components/DashboardTutorial";

const creatorNav = [
  { href: "/dashboard/creator", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/creator/campaigns", label: "Discover campaigns", icon: BriefcaseBusiness },
  { href: "/dashboard/creator/clips", label: "My submissions", icon: Clapperboard },
  { href: "/dashboard/creator/earnings", label: "Wallet", icon: Wallet },
  { href: "/dashboard/creator/accounts", label: "Accounts", icon: Link2 },
];
const studioNav = [
  { href: "/dashboard/studio", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/studio/campaigns", label: "Campaigns", icon: BriefcaseBusiness },
  { href: "/dashboard/studio/reviews", label: "Clip reviews", icon: FileCheck2 },
  { href: "/dashboard/studio/analytics", label: "Analytics", icon: Activity },
  { href: "/dashboard/studio/billing", label: "Billing", icon: BadgeDollarSign },
];
const adminNav = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
];

export function DashboardShell({
  role,
  title,
  description,
  displayName = "Preview account",
  showAdmin = false,
  showDeveloper = false,
  avatarUrl,
  workspace,
  studioCanManageCampaigns = true,
  showTutorial = false,
  children,
}: {
  role: "creator" | "studio" | "admin" | "developer";
  title: string;
  description: string;
  displayName?: string;
  showAdmin?: boolean;
  showDeveloper?: boolean;
  avatarUrl?: string | null;
  workspace?: { name: string; description: string | null; websiteUrl: string | null; bannerUrl: string | null };
  studioCanManageCampaigns?: boolean;
  showTutorial?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(showTutorial);
  const nav = role === "creator" ? creatorNav : role === "studio" ? studioNav : role === "developer" ? [{ href: "/dashboard/developer", label: "Developer console", icon: ShieldCheck }] : adminNav;
  const root = `/dashboard/${role}`;

  return (
    <div className={`dashboard${open ? " sidebar-open" : ""}`}>
      <aside className="dash-sidebar">
        <Link href="/" className="dash-brand"><Image src="/alypne-logo.png" alt="" width={23} height={23} /> Alypne</Link>
        <div className="dash-workspace"><small>WORKSPACE</small>{role === "creator" ? "Creator dashboard" : role === "studio" ? workspace?.name || "Studio setup" : role === "developer" ? "Developer console" : "Admin console"}</div>
        <div className="dash-workspace-switcher" aria-label="Switch workspace">
          <Link href="/dashboard/creator" className={role === "creator" ? "active" : ""} onClick={() => setOpen(false)}>Creator</Link>
          <Link href="/dashboard/studio" className={role === "studio" ? "active" : ""} onClick={() => setOpen(false)}>Studio</Link>
          {showAdmin && <Link href="/dashboard/admin" className={role === "admin" ? "active" : ""} onClick={() => setOpen(false)}><ShieldCheck size={12} /> Admin</Link>}
          {showDeveloper && <Link href="/dashboard/developer" className={role === "developer" ? "active" : ""} onClick={() => setOpen(false)}><ShieldCheck size={12} /> Developer</Link>}
        </div>
        {role !== "admin" && <><div className="dash-group-label">Workspace</div>
        <nav className="dash-nav" aria-label={`${role} dashboard`}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link className={pathname === href ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}>
              <Icon size={14} />{label}
            </Link>
          ))}
        </nav>
        </>}
        {role !== "admin" && role !== "developer" && <><div className="dash-group-label">More</div>
        <nav className="dash-nav">
          <Link className={pathname === `${root}/messages` ? "active" : ""} href={`${root}/messages`} onClick={() => setOpen(false)}><Bell size={14} />Messages</Link>
          <Link className={pathname === `${root}/help` ? "active" : ""} href={`${root}/help`} onClick={() => setOpen(false)}><HelpCircle size={14} />Help center</Link>
        </nav>
        </>}
        <div className="dash-sidebar-bottom">
          {role !== "admin" && role !== "developer" && <><div className="dash-group-label">Account</div>
          <nav className="dash-nav">
            <Link className={pathname === `${root}/settings` ? "active" : ""} href={`${root}/settings`}><Settings size={14} /> Settings</Link>
          </nav></>}
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-topbar">
          <span><button type="button" className="dash-mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={14} /> : <Menu size={14} />}</button>Dashboard&nbsp; / &nbsp;{title}</span>
          <div className="dash-top-actions">
            <details className="profile-menu">
              <summary aria-label="Open profile menu">
                {avatarUrl ? <Image className="dash-avatar-image" src={avatarUrl} alt="" width={32} height={32} unoptimized /> : <span className="dash-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>}
                <span className="profile-menu-name">{displayName}</span>
                <span className="profile-menu-chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="profile-menu-popover" role="menu">
                <div className="profile-menu-identity">{avatarUrl ? <Image className="dash-avatar-image" src={avatarUrl} alt="" width={42} height={42} unoptimized /> : <span className="dash-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>}<strong>{displayName}</strong></div>
                <Link href={`/dashboard/${role === "admin" || role === "developer" ? "creator" : role}/settings`} role="menuitem"><Settings size={15} />Settings</Link>
                <button type="button" role="menuitem" onClick={() => setSupportOpen(true)}><LifeBuoy size={15} />Message Alypne</button>
                {role !== "creator" && <Link href="/dashboard/creator" role="menuitem"><ArrowLeftRight size={15} />Switch to creator</Link>}
                {role !== "studio" && <Link href="/dashboard/studio" role="menuitem"><ArrowLeftRight size={15} />Switch to studio</Link>}
                <Link href="/" role="menuitem"><Globe size={15} />Homepage</Link>
                <form action="/api/auth/logout" method="post"><button type="submit" role="menuitem"><LogOut size={15} />Sign out</button></form>
              </div>
            </details>
          </div>
        </header>
        <main className="dash-content">
          {role === "studio" && workspace && <div className="studio-dashboard-banner" style={workspace.bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(7, 8, 9, .92), rgba(7, 8, 9, .25)), url(${JSON.stringify(workspace.bannerUrl)})` } : undefined}>
            <span className="studio-banner-label">STUDIO WORKSPACE</span>
            <strong>{workspace.name}</strong>
            <span>{workspace.description || "Creator campaigns · Clip reviews · Workspace settings"}</span>
            {workspace.websiteUrl && <a href={workspace.websiteUrl} target="_blank" rel="noreferrer">Visit studio website ↗</a>}
          </div>}
          <div className="dash-title-row">
            <div><h1>{title}</h1><p>{description}</p></div>
              {role === "creator"
              ? <Link className="button button-outline" href={title === "Overview" ? "/dashboard/creator/campaigns" : "/dashboard/creator/clips/new"}>{title === "Overview" ? "Discover campaigns" : "Submit a clip"}</Link>
                : role === "studio" && studioCanManageCampaigns ? <Link className="button button-outline" href="/dashboard/studio/campaigns/new">Create campaign</Link> : null}
          </div>
          {children}
        </main>
      </div>
      {supportOpen && <SupportMessageModal onClose={() => setSupportOpen(false)} />}
      {tutorialOpen && <DashboardTutorial onComplete={() => setTutorialOpen(false)} />}
    </div>
  );
}
