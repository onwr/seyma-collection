"use client"

import { motion } from "framer-motion"
import { FaQuoteLeft, FaStar } from "react-icons/fa"

interface Review {
  id: number
  rating: number
  comment: string
  createdAt: string
  user: { name: string }
  product: { name: string }
}

export function HomeTestimonials({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null

  return (
    <section className="overflow-hidden bg-zinc-50 rounded-[4rem] border border-zinc-100">
      <div className="text-center px-4">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Mutlu2 Anneler Ne Diyor?</span>
        <h2 className="mt-2 text-4xl font-black text-zinc-900 tracking-tight">Müşteri Deneyimleri</h2>
      </div>

      <div className="relative">
        <div className="flex flex-nowrap gap-6 px-8 overflow-x-auto pb-10 scrollbar-hide no-scrollbar snap-x">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="min-w-[320px] md:min-w-[400px] bg-white p-10 rounded-[3rem] shadow-xl shadow-zinc-200/40 border border-zinc-50 snap-center relative"
            >
              <FaQuoteLeft className="absolute top-8 right-8 text-zinc-50 text-6xl" />
              <div className="relative z-10">
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar key={s} className={`text-sm ${s <= review.rating ? 'text-amber-400' : 'text-zinc-100'}`} />
                  ))}
                </div>
                <p className="text-[15px] font-medium text-zinc-600 leading-relaxed italic mb-8 line-clamp-4">
                  "{review.comment}"
                </p>
                <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-zinc-900 text-sm uppercase tracking-wider">{review.user.name}</h4>
                    <p className="text-[11px] text-zinc-400 font-bold mt-1 line-clamp-1">{review.product.name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-[10px] font-black">
                    {review.user.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
