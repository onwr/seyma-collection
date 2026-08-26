import type { Metadata } from "next"
import { Baloo_2, Poppins } from "next/font/google"
import "./globals.css"
import { prisma } from "@/lib/prisma"
import { getSiteBrandingSettings, siteKeywordsToArray } from "@/lib/siteSettings"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.littlemomstore.com"

const baloo2 = Baloo_2({
  variable: "--font-baloo2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSiteBrandingSettings(prisma)
  const keywords = siteKeywordsToArray(branding.metaKeywordsRaw)

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: branding.titleDefault,
      template: branding.titleTemplate,
    },
    description: branding.metaDescription,
    keywords,
    authors: [{ name: branding.ogSiteName }],
    creator: branding.ogSiteName,
    publisher: branding.ogSiteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png", sizes: "any" }],
      shortcut: "/favicon.png",
      apple: "/favicon.png",
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: siteUrl,
      siteName: branding.ogSiteName,
      title: branding.titleDefault,
      description: branding.metaDescription,
      images: [
        {
          url: branding.ogImageUrl,
          width: 1200,
          height: 630,
          alt: branding.titleDefault,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: branding.titleDefault,
      description: branding.metaDescription,
      images: [branding.ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: siteUrl,
    },
    category: "shopping",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="tr"
      className={`${baloo2.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
