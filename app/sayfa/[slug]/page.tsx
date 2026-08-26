import { notFound } from "next/navigation"
import { LEGAL_PAGES } from "@/lib/legalPages"
import Link from "next/link"
import { FaChevronLeft } from "react-icons/fa"

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({
    slug,
  }))
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = LEGAL_PAGES[slug]

  if (!page) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <Link 
        href="/" 
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
      >
        <FaChevronLeft className="h-3 w-3" />
        Anasayfaya Dön
      </Link>
      <div className="mb-8 border-b border-zinc-200 pb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {page.title}
        </h1>
      </div>
      <div className="prose prose-zinc max-w-none text-zinc-700">
        {page.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-4 whitespace-pre-wrap leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}
