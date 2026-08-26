"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

interface Banner {
  id: number
  title: string | null
  imageUrl: string
  linkUrl: string | null
  position: string
}

export function HomePromoBanner({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null

  return (
    <section className={`mb-16 grid grid-cols-1 gap-8 ${banners.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
      {banners.map((banner, idx) => (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="group relative h-[250px] md:h-[400px] lg:h-[450px] overflow-hidden rounded-3xl bg-zinc-100 shadow-xl shadow-zinc-200/20"
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title || "Kampanya"}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-10">
            {banner.title && (
              <h2 className="text-2xl md:text-3xl font-black text-white mb-6 leading-tight drop-shadow-md">
                {banner.title}
              </h2>
            )}
            {banner.linkUrl && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={banner.linkUrl}
                  className="w-fit block rounded-2xl bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-900 transition hover:bg-zinc-100 shadow-2xl"
                >
                  ŞİMDİ İNCELE
                </Link>
              </motion.div>
            )}
          </div>

          {/* Decorative element */}
          <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </motion.div>
      ))}
    </section>
  )
}
