"use client"

import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { AdminSidebar } from "./AdminSidebar"
import Image from "next/image"

export function AdminShellClient({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <AdminSidebar 
        userEmail={userEmail} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-100 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-[#813d50]/10 flex items-center justify-center">
              <Image src="/logo.jpeg" alt="Logo" fill className="object-contain" />
            </div>
            <span className="text-[14px] font-bold text-zinc-800">Admin</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            <FaBars className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
