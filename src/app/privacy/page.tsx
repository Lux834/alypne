import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap prose">
        <span className="eyebrow">Legal draft</span>
        <h1>Privacy notice</h1>
        <p><strong>Review required:</strong> This draft describes the current development build. The Alypne operator must verify the legal entity, jurisdiction, retention schedule, and provider list before launch.</p>
        <h2>Information collected</h2>
        <p>If Discord sign-in is configured, Alypne requests the Discord identify scope and may store a Discord account ID, username, display name, avatar URL, role, and login timestamps. To keep the profile photo current, the Discord refresh token is encrypted with the application session secret in the configured database and used to refresh profile data at sign-in and when account settings are opened. Alypne sessions last up to 30 days. Messages sent to support, workspace invitations and permissions, and Stripe Connect account identifiers and onboarding status may also be stored when those features are configured.</p>
        <h2>How information is used</h2>
        <p>Account information is used to sign in, operate the service, protect accounts, and provide requested campaign and support features. Stripe Connect may be used for creator payout account onboarding when configured. A connected account alone does not mean Alypne has verified earnings or issued a payout; social views and earnings still require their own verified, funded workflows.</p>
        <h2>Storage and providers</h2>
        <p>When configured, account records, support conversations, workspace membership data, Stripe Connect account identifiers, and an encrypted Discord refresh token are stored in the MongoDB database selected by the Alypne operator. Discord handles authentication and Stripe handles Connect onboarding and payout-account details. Users can revoke Alypne access from Discord’s Authorized Apps settings.</p>
        <h2>Contact and deletion</h2>
        <p>For privacy questions or deletion requests, contact <a href="mailto:support@alypne.app">support@alypne.app</a>. Requests must be reviewed and fulfilled by the operator using the configured data stores.</p>
      </div>
    </MarketingLayout>
  );
}
