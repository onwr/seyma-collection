const brands = [
  "Munchkin", "Carter's", "OshKosh", "BabyBjörn", "Philips Avent", "Fisher-Price"
]

export function HomeBrands() {
  return (
    <section className="mb-12 border-y border-zinc-100 bg-zinc-50/50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-zinc-400">
          En Sevilen Markalar
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:gap-16">
          {brands.map((brand) => (
            <span key={brand} className="text-xl font-black italic text-zinc-300 md:text-2xl">
              {brand.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
