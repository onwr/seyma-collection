"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { FaUser, FaBox, FaStar, FaHeart, FaSignOutAlt, FaChevronDown, FaCog } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { dispatchCartUpdated } from "@/lib/cartEvents"

export function HeaderAuthNav() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: number; email: string; name?: string; role: string } | null | undefined>(undefined)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" })
        const json = (await res.json()) as { user: { id: number; email: string; name?: string; role: string } | null }
        setUser(json.user ?? null)
      } catch {
        setUser(null)
      }
    })()
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    dispatchCartUpdated()
    setUser(null)
    setIsOpen(false)
    router.replace("/")
    router.refresh()
  }

  if (user === undefined) {
    return (
      <div className="flex items-center gap-2 opacity-60">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-[#bcd2bf]">
          <FaUser />
        </span>
        <span className="text-xs font-bold text-zinc-400">YÜKLENİYOR...</span>
      </div>
    )
  }

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 group transition-all"
        >
          <div className="hidden sm:flex flex-col items-end">
             {user.role === "ADMIN" ? (
               <span className="mb-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#bcd2bf]">
                 ADMIN
               </span>
             ) : (
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Hesabım</span>
             )}
             <span className="text-sm font-black text-zinc-900 group-hover:text-[#6f8f73] transition-colors">
                {user.name || user.email.split("@")[0]}
             </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-zinc-100 text-[#6f8f73] group-hover:border-[#6f8f73] transition-all bg-white overflow-hidden">
            <FaUser className="h-4 w-4" />
          </div>
          <FaChevronDown className={`h-3 w-3 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-64 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-2xl z-100"
            >
              <div className="bg-[#f4f7f4]/50 p-6 border-b border-zinc-100">
                <p className="text-[10px] font-black text-[#6f8f73] uppercase tracking-widest mb-1">Hoş Geldiniz</p>
                <p className="truncate text-sm font-black text-zinc-900">{user.email}</p>
              </div>

              <div className="p-2">
                {user.role === "ADMIN" && (
                  <>
                    <DropdownLink href="/admin" icon={<FaCog />} label="Yönetici Paneli" onClick={() => setIsOpen(false)} className="bg-[#6f8f73]/5 text-[#6f8f73] hover:bg-[#6f8f73] hover:text-white" />
                    <div className="my-2 border-t border-zinc-50" />
                  </>
                )}
                <DropdownLink href="/profil?tab=profil" icon={<FaCog />} label="Profilim" onClick={() => setIsOpen(false)} />
                <DropdownLink href="/profil?tab=siparisler" icon={<FaBox />} label="Siparişlerim" onClick={() => setIsOpen(false)} />
                <DropdownLink href="/profil?tab=degerlendirmeler" icon={<FaStar />} label="Değerlendirmelerim" onClick={() => setIsOpen(false)} />
                <DropdownLink href="/profil?tab=favoriler" icon={<FaHeart />} label="Favorilerim" onClick={() => setIsOpen(false)} />
                
                <div className="my-2 border-t border-zinc-50" />
                
                <button
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-500 transition-all hover:bg-rose-50"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-zinc-100 text-zinc-400 hover:border-[#6f8f73] hover:text-[#6f8f73] transition-all bg-white"
        aria-label="Üye girişi"
      >
        <FaUser className="h-4 w-4" />
      </Link>
      <div className="leading-tight hidden sm:block">
        <Link href="/login" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-[#6f8f73] transition-colors">
          Giriş Yap
        </Link>
        <Link href="/register" className="block text-sm font-black text-zinc-900 hover:text-[#6f8f73] transition-colors">
          ÜYE OL
        </Link>
      </div>
    </div>
  )
}

function DropdownLink({ href, icon, label, onClick, className }: { href: string, icon: React.ReactNode, label: string, onClick: () => void, className?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all group ${className || "text-zinc-600 hover:bg-zinc-50 hover:text-[#6f8f73]"}`}
    >
      <span className="text-zinc-400 group-hover:text-[#6f8f73] transition-colors">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
