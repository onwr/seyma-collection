"use client"

import { FaWhatsapp } from "react-icons/fa"

export function WhatsAppButton() {
  const phoneNumber = "905551234567" // Placeholder, can be updated later
  const message = encodeURIComponent("Merhaba, Little Mom's Store ile iletişime geçmek istiyorum.")

  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#25D366]/50"
      aria-label="WhatsApp ile İletişime Geçin"
    >
      <FaWhatsapp className="h-8 w-8" />
    </a>
  )
}
