import Link from "next/link"

const FAQ_PATH = "/sikca-sorulan-sorular"

type Props = {
  /** true ise son öğe (SSS) tıklanabilir bağlantı olur — örn. başka sayfadan */
  linkCurrent?: boolean
}

export function FaqBreadcrumb({ linkCurrent = false }: Props) {
  return (
    <nav aria-label="Sayfa konumu" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
        <li>
          <Link
            href="/"
            className="transition hover:text-[#6f8f73]"
          >
            Anasayfa
          </Link>
        </li>
        <li aria-hidden className="select-none text-zinc-300">
          ›
        </li>
        <li className="min-w-0">
          {linkCurrent ? (
            <Link
              href={FAQ_PATH}
              className="font-medium text-[#6f8f73] underline-offset-4 hover:underline"
            >
              <abbr title="Sıkça Sorulan Sorular" className="no-underline">
                SSS
              </abbr>
              <span className="sr-only"> (Sıkça Sorulan Sorular)</span>
            </Link>
          ) : (
            <span className="font-medium text-zinc-800" aria-current="page">
              <abbr
                title="Sıkça Sorulan Sorular"
                className="no-underline decoration-transparent"
              >
                SSS
              </abbr>
            </span>
          )}
        </li>
      </ol>
    </nav>
  )
}
