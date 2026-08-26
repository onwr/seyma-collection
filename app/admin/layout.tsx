import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminShellClient } from "@/components/admin/AdminShellClient"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionFromCookies()

  // Sadece ADMIN rolüne sahip kullanıcılar girebilir
  if (!session || session.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin")
  }

  return (
    <AdminShellClient userEmail={session.email}>
      {children}
    </AdminShellClient>
  )
}
