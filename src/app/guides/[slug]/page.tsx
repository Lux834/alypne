import { notFound } from "next/navigation";
import { MarketingLayout } from "@/components/MarketingLayout";
import { guides } from "@/lib/guides";

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) notFound();

  return (
    <MarketingLayout>
      <article className="page-wrap prose">
        <span className="eyebrow">Creator guide</span>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
        {guide.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      </article>
    </MarketingLayout>
  );
}
