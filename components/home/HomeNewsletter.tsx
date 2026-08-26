"use client"

export function HomeNewsletter() {
  return (
    <section className="mb-12 overflow-hidden rounded-3xl bg-[#6f8f73] p-12 text-center text-white">
      <h2 className="mb-2 text-3xl font-bold">Fırsatları Kaçırmayın</h2>
      <p className="mb-8 opacity-90">Bültenimize abone olun, yeni koleksiyonlar ve indirimlerden ilk siz haberdar olun.</p>
      <form className="mx-auto flex max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          placeholder="E-posta adresiniz"
          className="w-full rounded-full border-none bg-white px-6 py-3 text-zinc-900 focus:ring-2 focus:ring-[#bcd2bf]"
          required
        />
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-8 py-3 font-semibold transition hover:bg-zinc-800"
        >
          Kaydol
        </button>
      </form>
    </section>
  )
}
