import Link from "next/link"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 40

export default async function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const q = sp.q?.trim() ?? ""

  const where =
    q.length > 0
      ? {
          OR: [
            { action: { contains: q } },
            { resourceId: { contains: q } },
            { resourceType: { contains: q } },
            { actorEmail: { contains: q } },
          ],
        }
      : {}

  const [total, rows] = await Promise.all([
    prisma.adminActivity.count({ where }),
    prisma.adminActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        actorEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        metadata: true,
        ip: true,
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">İşlem günlüğü</h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">
            Yönetim panelinde yapılan kayıtlı işlemler (son {PAGE_SIZE} kayıt / sayfa).
          </p>
        </div>
        <form action="/admin/activity-log" method="get" className="flex w-full max-w-md gap-2 sm:w-auto">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="İşlem, kaynak, e-posta ara…"
            className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] outline-none focus:border-zinc-900"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-zinc-900 px-4 text-[12px] font-bold uppercase tracking-widest text-white hover:bg-zinc-800"
          >
            Ara
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">İşlem</th>
                <th className="px-4 py-3">Kaynak</th>
                <th className="px-4 py-3">Yapan</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Detay</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-zinc-500">
                      {r.createdAt.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-zinc-800">{r.action}</td>
                    <td className="max-w-[140px] truncate px-4 py-2.5 text-zinc-600" title={r.resourceType ?? ""}>
                      {r.resourceType ?? "—"}
                      {r.resourceId ? (
                        <span className="block truncate text-[11px] font-normal text-zinc-400">{r.resourceId}</span>
                      ) : null}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 text-zinc-600" title={r.actorEmail}>
                      {r.actorEmail}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-zinc-400">
                      {r.ip ?? "—"}
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5">
                      {r.metadata != null ? (
                        <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-snug text-zinc-500">
                          {JSON.stringify(r.metadata)}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-[13px] font-medium text-zinc-600">
          {page > 1 ? (
            <Link
              href={`/admin/activity-log?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-50"
            >
              Önceki
            </Link>
          ) : (
            <span className="rounded-lg px-3 py-1.5 text-zinc-300">Önceki</span>
          )}
          <span className="px-2">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/activity-log?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-50"
            >
              Sonraki
            </Link>
          ) : (
            <span className="rounded-lg px-3 py-1.5 text-zinc-300">Sonraki</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
