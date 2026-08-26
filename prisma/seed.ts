import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { CouponType, PrismaClient } from "../generated/prisma/client"
import * as dotenv from "dotenv"
import { DEFAULT_HEADER_NAV_ITEMS } from "../lib/defaultHeaderNav"

dotenv.config()

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL tanımlı değil.")
}

const adapter = new PrismaMariaDb(url)
const prisma = new PrismaClient({ adapter })

const names = [
  "Bebek Takımı", "Keten Şort", "Pamuklu Zıbın", "Bebek Ayakkabısı", "Örgü Tulum", "Çiçekli Elbise", "Kot Ceket", "Bebek Şapkası",
  "Pijama Takımı", "Yün Hırka", "Müslin Bez", "Peluş Mont", "Bandana Seti", "Bebek Battaniyesi", "Emzik Askısı", "Kadife Pantolon",
]

const prices = [
  249.90, 129.90, 179.90, 89.90, 199.90, 159.90, 349.90, 119.90,
  59.90, 79.90, 45.90, 289.90, 69.90, 99.90, 39.90, 149.90,
]

async function main() {
  console.log('Seeding products...')

  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const price = prices[i]
    const slug = `urun-${i + 1}`
    const image = `/urunler/urun${(i % 8) + 1}.jpg`

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        basePrice: price,
        description: `${name} için özel tasarım ve konfor. Bebeğiniz için en iyisi.`,
        isActive: true,
        isFeatured: i < 4,
        images: {
          create: [
            { url: image, isCover: true, alt: name }
          ]
        },
        variants: {
          create: [
            { 
              name: 'Standart', 
              price: price, 
              stock: 100, 
              isActive: true,
              sku: `SKU-${slug}-STD`
            }
          ]
        }
      },
    })
    console.log(`Created product: ${product.name}`)
  }

  console.log('Seeding settings...')
  const settings = [
    { key: 'FREE_SHIPPING_THRESHOLD', value: '750', type: 'number' },
    { key: 'STANDARD_SHIPPING_COST', value: '49.90', type: 'number' },
    { key: 'SITE_TITLE_DEFAULT', value: "Little Mom's Store", type: 'string' },
    { key: 'SITE_TITLE_TEMPLATE', value: "%s | Little Mom's Store", type: 'string' },
    {
      key: 'SITE_META_DESCRIPTION',
      value:
        'Anne ve bebek ürünleri, güvenilir alışveriş. Kıyafet, bakım, beslenme ve daha fazlası.',
      type: 'string',
    },
    {
      key: 'SITE_META_KEYWORDS',
      value:
        "anne bebek, bebek giyim, çocuk giyim, bebek ürünleri, Little Mom's Store, online mağaza",
      type: 'string',
    },
    { key: 'SITE_OG_SITE_NAME', value: "Little Mom's Store", type: 'string' },
    { key: 'SITE_FAVICON_URL', value: '/logo.jpeg', type: 'string' },
    { key: 'SITE_OG_IMAGE_URL', value: '/logo.jpeg', type: 'string' },
    { key: 'FOOTER_SOCIAL_FACEBOOK_URL', value: 'https://facebook.com', type: 'string' },
    { key: 'FOOTER_SOCIAL_TWITTER_URL', value: 'https://twitter.com', type: 'string' },
    { key: 'FOOTER_SOCIAL_INSTAGRAM_URL', value: 'https://instagram.com', type: 'string' },
    { key: 'FOOTER_SOCIAL_YOUTUBE_URL', value: 'https://youtube.com', type: 'string' },
    { key: 'FOOTER_SOCIAL_GOOGLE_URL', value: 'https://google.com', type: 'string' },
    { key: 'SMTP_HOST', value: '', type: 'string' },
    { key: 'SMTP_PORT', value: '587', type: 'string' },
    { key: 'SMTP_ENCRYPTION', value: 'tls', type: 'string' },
    { key: 'SMTP_USER', value: '', type: 'string' },
    { key: 'SMTP_PASSWORD', value: '', type: 'string' },
    { key: 'SMTP_FROM_EMAIL', value: '', type: 'string' },
    { key: 'SMTP_FROM_NAME', value: '', type: 'string' },
    { key: 'SMTP_AUTO_TLS', value: 'true', type: 'string' },
    { key: 'SMTP_MAIL_ENABLED', value: 'false', type: 'string' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s
    })
  }

  console.log("Seeding header navigation...")
  const navCount = await prisma.headerNavItem.count()
  if (navCount === 0) {
    await prisma.headerNavItem.createMany({
      data: DEFAULT_HEADER_NAV_ITEMS.map((row) => ({
        label: row.label,
        href: row.href,
        labelUppercase: row.labelUppercase,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        openInNewTab: row.openInNewTab,
      })),
    })
    console.log(`Inserted ${DEFAULT_HEADER_NAV_ITEMS.length} header nav items`)
  }

  console.log('Seeding coupons...')
  const coupons = [
    { code: 'MERHABA20', type: 'PERCENTAGE', value: 20, description: '%20 Hoşgeldin İndirimi' },
    { code: 'YAZ100', type: 'FIXED', value: 100, description: '100 TL Yaz İndirimi' },
  ]

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { value: c.value, type: c.type as CouponType },
      create: {
        code: c.code,
        type: c.type as CouponType,
        value: c.value,
        description: c.description,
        isActive: true
      }
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
