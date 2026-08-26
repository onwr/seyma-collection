"use client"

import { useId, useState } from "react"
import { FaChevronDown } from "react-icons/fa"
import type { FaqPublic } from "@/lib/faq"

type Props = {
  items: FaqPublic[]
  /** İlk yüklemede açık satır; null ise hepsi kapalı */
  defaultOpenId?: number | null
}

function groupByCategory(items: FaqPublic[]) {
  const map = new Map<string, FaqPublic[]>()
  for (const item of items) {
    const key = item.category?.trim() || "Genel"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

export function FaqAccordion({ items, defaultOpenId }: Props) {
  const baseId = useId()
  const initial =
    defaultOpenId !== undefined
      ? defaultOpenId
      : items[0]?.id ?? null
  const [openId, setOpenId] = useState<number | null>(initial)

  if (items.length === 0) {
    return null
  }

  const grouped = groupByCategory(items)

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {grouped.map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            {category}
          </h3>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {list.map((faq) => {
              const isOpen = openId === faq.id
              const panelId = `${baseId}-panel-${faq.id}`
              const triggerId = `${baseId}-trigger-${faq.id}`
              return (
                <li key={faq.id}>
                  <button
                    type="button"
                    id={triggerId}
                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-zinc-50/80 md:px-5"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenId((prev) => (prev === faq.id ? null : faq.id))
                    }
                  >
                    <span className="text-sm font-medium text-zinc-900 md:text-[15px]">
                      {faq.question}
                    </span>
                    <span
                      className={`mt-0.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    >
                      <FaChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    hidden={!isOpen}
                  >
                    <div className="border-t border-zinc-100 px-4 pb-4 pt-0 md:px-5 md:pb-5">
                      <p className="pt-3 text-sm leading-relaxed text-zinc-600 whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
