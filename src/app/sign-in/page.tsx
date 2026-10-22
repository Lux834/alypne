import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export const metadata = { title: "Sign in" };

const signInMessages: Record<string, string> = {
  cancelled: "Discord sign-in was cancelled.",
  forbidden: "This account is not authorized for that workspace.",
  failed: "We could not finish sign-in. Please try again.",
  invalid_state: "This sign-in request expired or could not be verified. Please try again.",
  provider: "Discord could not verify your account right now. Please try again.",
  unconfigured: "Discord sign-in is unavailable until its credentials and database are configured.",
  configuration: "The Discord callback configuration is invalid. Contact the Alypne operator.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const missingConfiguration = [
    ["MONGODB_URI", process.env.MONGODB_URI],
    ["DISCORD_CLIENT_ID", process.env.DISCORD_CLIENT_ID],
    ["DISCORD_CLIENT_SECRET", process.env.DISCORD_CLIENT_SECRET],
    ["DISCORD_REDIRECT_URI", process.env.DISCORD_REDIRECT_URI],
    ["SESSION_SECRET (at least 32 characters)", process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 ? process.env.SESSION_SECRET : ""],
    ["ADMIN_DISCORD_ID", process.env.ADMIN_DISCORD_ID],
  ].filter(([, value]) => !value).map(([key]) => key);
  const configured = missingConfiguration.length === 0;
  return (
    <main className="page-wrap">
      <section className="sign-in-card">
        <Brand />
        <h1>Welcome to Alypne</h1>
        <p>Sign in to continue to your creator or studio workspace.</p>
        {error && signInMessages[error] && <div className="demo-banner" role="alert">{signInMessages[error]}</div>}
        {configured ? (
          <a className="button button-primary" href="/api/auth/discord">Continue with Discord <ExternalLink size={14} /></a>
        ) : (
          <>
            <button className="button button-primary" type="button" disabled>Continue with Discord</button>
            <div className="configuration-notice">
              <p>Set these values in <code>.env.local</code>, then restart the dev server:</p>
              <ul>{missingConfiguration.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
            </div>
          </>
        )}
        <Link className="text-link" href="/" style={{ marginTop: 18 }}><ArrowLeft size={14} /> Back to Alypne</Link>
      </section>
    </main>
  );
}
