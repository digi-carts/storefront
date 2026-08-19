'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { api } from '@/lib/api';
import { useStorefrontStore } from '@/lib/storefront-store';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';

interface Page { id: string; slug: string; title: string; content: string; published: boolean }

// Markdown component overrides — defined at module level to avoid re-creation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdComponents: Record<string, any> = {
  h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
  h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold mt-5 mb-2">{children}</h2>,
  h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
  h4: ({ children }: { children: React.ReactNode }) => <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>,
  p: ({ children }: { children: React.ReactNode }) => <p className="mb-3 leading-relaxed">{children}</p>,
  strong: ({ children }: { children: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
  li: ({ children }: { children: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }: { children: React.ReactNode }) => <blockquote className="border-l-4 border-neutral-300 pl-4 italic text-neutral-500 my-3">{children}</blockquote>,
  code: ({ children }: { children: React.ReactNode }) => <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
  pre: ({ children }: { children: React.ReactNode }) => <pre className="bg-neutral-100 p-4 rounded-lg overflow-x-auto text-xs font-mono mb-3">{children}</pre>,
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => <a href={href} className="underline text-indigo-600 hover:text-indigo-800" target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>,
  hr: () => <hr className="border-neutral-200 my-6" />,
};

export default function CustomPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { store } = useStorefrontStore();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!store?.id || !slug) return;
    api.get(`/store/pages/public/${store.id}/${slug}`)
      .then(r => setPage(r.data.page))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [store?.id, slug]);

  if (loading) return (
    <TemplateWrapper>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-neutral-400 text-sm">Loading…</div>
    </TemplateWrapper>
  );

  if (notFound || !page) return (
    <TemplateWrapper>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-neutral-400 text-sm">This page doesn&apos;t exist or has been unpublished.</p>
      </div>
    </TemplateWrapper>
  );

  return (
    <TemplateWrapper>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
        <div className="max-w-none text-sm leading-relaxed space-y-3">
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={mdComponents}>
            {page.content}
          </ReactMarkdown>
        </div>
      </div>
    </TemplateWrapper>
  );
}
