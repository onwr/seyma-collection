import "dotenv/config"
import { prisma } from "../lib/prisma"

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, categoryId: true, subCategoryId: true },
  })

  let created = 0
  for (const p of products) {
    const categoryIds = [p.categoryId, p.subCategoryId]
      .filter((v): v is number => typeof v === "number" && Number.isInteger(v))
    const uniq = Array.from(new Set(categoryIds))

    for (const categoryId of uniq) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: { productId: p.id, categoryId },
        },
        update: {},
        create: { productId: p.id, categoryId },
      })
      created++
    }
  }

  console.log(`Backfill completed. Links processed: ${created}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

