"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FaChevronDown, FaQuestionCircle } from "react-icons/fa"

interface FaqItem {
  id: number
  question: string
  answer: string
}

export function HomeFaqSection({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <section className="my-5 max-w-4xl mx-auto px-4">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-xl">
           <FaQuestionCircle /> YARDIM MERKEZİ
        </div>
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Sıkça Sorulan Sorular</h2>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`rounded-4xl border transition-all duration-500 overflow-hidden
              ${openId === item.id ? 'bg-white border-zinc-200 shadow-2xl shadow-zinc-200/50' : 'bg-white border-zinc-100 hover:border-zinc-200'}`}
          >
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-8 text-left outline-none"
            >
              <span className={`text-[15px] font-black tracking-tight transition-colors ${openId === item.id ? 'text-zinc-900' : 'text-zinc-500'}`}>
                {item.question}
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${openId === item.id ? 'bg-zinc-900 text-white rotate-180' : 'bg-zinc-50 text-zinc-300'}`}>
                <FaChevronDown className="text-xs" />
              </div>
            </button>
            
            <AnimatePresence>
              {openId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <div className="px-8 pb-8">
                    <div className="h-px w-12 bg-zinc-100 mb-6" />
                    <p className="text-[14px] text-zinc-500 font-medium leading-7">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}
