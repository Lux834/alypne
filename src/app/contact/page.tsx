import { Mail } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading">
          <span className="eyebrow">Contact</span>
          <h1>Get in touch with Alypne.</h1>
          <p>For account, campaign, or support questions, email our support address. Do not send passwords, payment credentials, or other secrets by email.</p>
        </div>
        <a className="button button-primary" href="mailto:support@alypne.app"><Mail size={15} /> support@alypne.app</a>
      </div>
    </MarketingLayout>
  );
}
