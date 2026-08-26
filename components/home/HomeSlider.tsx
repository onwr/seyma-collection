"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { FaArrowLeft, FaArrowRight } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Slide {
  id: number
  imageUrl: string
  linkUrl: string | null
}

export function HomeSlider({ slides }: { slides: Slide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const total = slides.length

  const go = (direction: "next" | "prev") => {
    setCurrentIndex((prev) => {
      if (direction === "next") return (prev + 1) % total
      return (prev - 1 + total) % total
    })
  }

  const getRelativeIndex = (index: number) => {
    let diff = index - currentIndex
    if (diff > 1) diff -= total
    if (diff < -1) diff += total
    return diff
  }

  const neighborOffsetPercent = 100

  // Otomatik kaydırma
  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(() => go("next"), 6000)
    return () => clearInterval(timer)
  }, [currentIndex, total])

  if (total === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="mt-8 md:my-8"
    >
      <div className="relative overflow-hidden rounded-3xl">
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go("prev")}
              className="absolute left-3 top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/70 bg-white/55 p-3 text-zinc-700 shadow-md backdrop-blur-md transition hover:bg-white/80"
            >
              <FaArrowLeft className="h-4 w-4 text-[#8cae90]" />
            </button>
            <button
              type="button"
              onClick={() => go("next")}
              className="absolute right-3 top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/70 bg-white/55 p-3 text-zinc-700 shadow-md backdrop-blur-md transition hover:bg-white/80"
            >
              <FaArrowRight className="h-4 w-4 text-[#8cae90]" />
            </button>
          </>
        )}

        <div className="relative h-[240px] md:h-[550px] overflow-hidden">
          <AnimatePresence initial={false}>
            {slides.map((slide, index) => {
              const relative = getRelativeIndex(index)
              const isActive = relative === 0
              const isNeighbor = Math.abs(relative) === 1
              const hidden = Math.abs(relative) > 1

              if (hidden) return null

              const Content = (
                <motion.article
                  initial={false}
                  animate={{
                    x: `calc(-50% + ${relative * neighborOffsetPercent}%)`,
                    y: isActive ? 0 : 28,
                    scale: isActive ? 1 : 0.95,
                    opacity: isActive ? 1 : isNeighbor ? 0.42 : 0,
                    zIndex: isActive ? 30 : 20,
                    filter: isActive ? "none" : "brightness(0.96)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25
                  }}
                  className="absolute left-1/2 top-0 h-full w-[78%] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:w-[62%]"
                >
                  {!isActive && (
                    <div className="pointer-events-none absolute inset-0 z-10 bg-white/35" />
                  )}
                  <Image
                    src={slide.imageUrl}
                    alt="Slider"
                    width={1400}
                    height={560}
                    quality={95}
                    sizes="(max-width: 768px) 78vw, 62vw"
                    className="h-full w-full object-cover"
                    draggable={false}
                    priority={index === 0}
                  />
                </motion.article>
              )

              return slide.linkUrl ? (
                <Link key={slide.id} href={slide.linkUrl}>
                  {Content}
                </Link>
              ) : (
                <div key={slide.id}>
                  {Content}
                </div>
              )
            })}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 z-35 w-16 bg-linear-to-r from-white from-10% via-white/50 to-transparent sm:w-24 md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-35 w-16 bg-linear-to-l from-white from-10% via-white/50 to-transparent sm:w-24 md:w-32" />
      </div>
    </motion.section>
  )
}
