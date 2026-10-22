import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPolicies, getPolicy } from '@/lib/policies';
import { site } from '@/lib/site';
import { cn, formatDate } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  return policy ? { title: policy.title, description: policy.summary } : { title: 'Policy not found' };
}

export default async function PolicyPage({ params }: PageProps) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-16">
      <nav aria-label="Policies" className="lg:sticky lg:top-28 lg:h-fit">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {getPolicies().map((item) => (
            <li key={item.slug}>
              <Link
                href={`/policies/${item.slug}`}
                aria-current={item.slug === policy.slug ? 'page' : undefined}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium',
                  item.slug === policy.slug ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-prose">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{policy.title}</h1>
        <p className="mt-3 text-lg text-slate-600">{policy.summary}</p>
        <p className="mt-2 text-sm text-slate-500">Last updated {formatDate(policy.updated)}</p>
        <div className="prose-policy">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          <h2>Questions</h2>
          <p>
            Contact {site.legalName} at <a className="font-medium text-brand-700 underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
            {site.supportPhone ? ` or ${site.supportPhone}` : ''}.
          </p>
        </div>
      </article>
    </div>
  );
}
