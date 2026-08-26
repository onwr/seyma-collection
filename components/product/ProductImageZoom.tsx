"use client"

import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { FaTimes, FaSearchPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

type ProductImage = {
  src: string
  alt: string
}

type Props = {
  images: ProductImage[]
  currentIndex: number
}

const swipeConfidenceThreshold = 10000
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity
}

export function ProductImageZoom({ images, currentIndex }: Props) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [modalIdx, setModalIdx] = useState(currentIndex)
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeImage = images[modalIdx] || images[0]
  const previewImage = images[currentIndex] || images[0]

  useEffect(() => {
    if (isOpen) setModalIdx(currentIndex)
  }, [isOpen, currentIndex])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    const x = ((e.pageX - left - window.scrollX) / width) * 100
    const y = ((e.pageY - top - window.scrollY) / height) * 100
    setMousePos({ x, y })
  }

  const navigate = (newDirection: number) => {
    setDirection(newDirection)
    setModalIdx((prev) => (prev + newDirection + images.length) % images.length)
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <>
      {/* Önizleme Alanı */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setIsOpen(true)}
        className="group relative aspect-4/5 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white cursor-zoom-in"
      >
        <Image
          src={previewImage.src}
          alt={previewImage.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover transition-transform duration-200 ease-out ${
            isHovering ? "scale-150" : "scale-100"
          }`}
          style={{
            transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
          }}
        />
        <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-zinc-600 opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
          <FaSearchPlus className="h-4 w-4" />
        </div>
      </div>

      {/* Gelişmiş Swiper Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:right-8 md:top-8"
            >
              <FaTimes className="h-6 w-6" />
            </button>

            {/* Ana Görsel ve Swipe Alanı */}
            <div 
              className="relative flex h-[60vh] w-full max-w-4xl items-center justify-center md:h-[70vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigate(-1)}
                    className="absolute -left-4 z-10 hidden rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20 md:flex md:-left-20"
                  >
                    <FaChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigate(1)}
                    className="absolute -right-4 z-10 hidden rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20 md:flex md:-right-20"
                  >
                    <FaChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              
              <div className="relative h-full w-full overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={modalIdx}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = swipePower(offset.x, velocity.x)
                      if (swipe < -swipeConfidenceThreshold) {
                        navigate(1)
                      } else if (swipe > swipeConfidenceThreshold) {
                        navigate(-1)
                      }
                    }}
                    className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  >
                    <Image
                      src={activeImage.src}
                      alt={activeImage.alt}
                      fill
                      className="pointer-events-none object-contain"
                      sizes="90vw"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Küçük Resimler (Thumbnails) */}
            <div 
              className="mt-8 flex gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > modalIdx ? 1 : -1)
                    setModalIdx(i)
                  }}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all md:h-20 md:w-20 ${
                    i === modalIdx ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image src={img.src} alt={img.alt} fill className="object-cover" />
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-zinc-500 md:text-sm">
              Görüntü {modalIdx + 1} / {images.length} • Kaydırarak geçiş yapabilirsiniz
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
