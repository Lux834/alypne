import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Data deletion" };

export default function DataDeletionPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap prose">
        <span className="eyebrow">Account privacy</span>
        <h1>Request data deletion</h1>
        <p>To request deletion of an Alypne account or personal information, email <a href="mailto:support@alypne.app?subject=Alypne%20data%20deletion%20request">support@alypne.app</a> from the email address associated with your account, if applicable. Include your Alypne username or Discord username, but never send a password or payment details.</p>
        <h2>What happens next</h2>
        <p>The operator will verify the request, identify data held in configured Alypne systems, including support conversations, workspace membership and invitations, Stripe Connect account identifiers, and the encrypted Discord refresh-token record, and respond about the applicable deletion process. Users can also revoke Alypne in Discord’s Authorized Apps settings and manage payout details through Stripe. Some information may need to be retained where required by law or for legitimate dispute and accounting records.</p>
        <h2>Current development status</h2>
        <p>The account deletion workflow is not automated in this preview. Do not use this development build to submit sensitive information.</p>
      </div>
    </MarketingLayout>
  );
}
