import { Suspense } from "react"
import { HomepageManagementClient } from "./HomepageManagementClient"

function HomepageFallback() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-[#fcfcfc] flex items-center justify-center text-zinc-400 text-sm font-medium">
      Yükleniyor…
    </div>
  )
}

export default function AdminHomepagePage() {
  return (
    <Suspense fallback={<HomepageFallback />}>
      <HomepageManagementClient />
    </Suspense>
  )
}
