"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { FaChevronRight } from "react-icons/fa"

interface Category {
  id: number
  name: string
  slug: string
  imageUrl: string | null
}

export function HomeCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="my-24">
      <div className="mb-12 text-center">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Koleksiyonlarımızı Keşfedin</span>
        <h2 className="mt-2 text-4xl font-black text-zinc-900 tracking-tight">Kategoriler</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {categories.map((category, idx) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link href={`/categories/${category.slug}`} className="group block text-center">
              <div className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-zinc-50 border border-zinc-100 shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-zinc-200/50 group-hover:-translate-y-2">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 16vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-200 text-4xl bg-zinc-50 font-black">
                    {category.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-xl border border-white/20">
                  <FaChevronRight className="text-zinc-900 text-[10px]" />
                </div>
              </div>
              <h3 className="mt-4 text-[14px] font-black text-zinc-800 group-hover:text-primary transition-colors uppercase tracking-widest">
                {category.name}
              </h3>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
