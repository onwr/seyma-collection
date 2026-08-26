import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import JSZip from "jszip"
import fs from "fs/promises"
import path from "path"
import {
  COL,
  BRAND_NAME,
  YAS_GRUBU_DEFAULT,
  MENSEI_DEFAULT,
  BELIRTILMEMIS,
  EXPORT_PRODUCT_SELECT,
  ExportProduct,
  buildRow,
  generateBarcode,
} from "@/lib/trendyolExport"

// Trendyol'dan indirilen resmi "Elbise" şablonu — sıfırdan dosya üretmek yerine bu şablonu
// dolduruyoruz, çünkü Trendyol'un yükleme parser'ı diğer sayfalara (Urun_Ozellik_Bilgileri vb.)
// ve şablona gömülü kategori/doğrulama ayarlarına bağımlı; kendi ürettiğimiz tek sayfalık dosya
// "Unexpected exception occurred" hatası veriyordu.
//
// Not: Excel kütüphanesi (exceljs) ile bu dosyayı okuyup yazmak, şablondaki 50+ tam-sütun
// data validation kuralı (ör. "AA2:AA1048576") yüzünden dakikalarca sürüp 504 timeout'a
// sebep oluyordu. Bunun yerine xlsx'in kendisi bir zip dosyası olduğundan, sadece ilgili
// sayfanın XML'ini (xl/worksheets/sheet1.xml) doğrudan string olarak düzenliyoruz — diğer
// sayfalar, stiller ve doğrulamalar hiç parse edilmediği için bu işlem milisaniyeler sürüyor.
const TEMPLATE_PATH = path.join(process.cwd(), "templates", "trendyol", "elbise-sablon.xlsx")
const SHEET_XML_PATH = "xl/worksheets/sheet1.xml" // "Ürünlerinizi Burada Listeleyin"

function colLetter(n: number): string {
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // XML 1.0'da izin verilmeyen kontrol karakterlerini temizle (tab/newline hariç)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
}

function textCell(ref: string, value: string | null | undefined): string {
  if (!value) return ""
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
}

function numberCell(ref: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ""
  return `<c r="${ref}"><v>${value}</v></c>`
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")
    const commissionRaw = Number(searchParams.get("commission") ?? "0")
    const commission = Number.isFinite(commissionRaw) ? Math.max(0, commissionRaw) : 0
    const multiplier = 1 + commission / 100

    const where: any = {}
    if (idsParam) {
      const ids = idsParam.split(",").map((id) => Number(id)).filter((n) => Number.isInteger(n))
      if (ids.length === 0) {
        return NextResponse.json({ message: "Geçerli ürün seçilmedi." }, { status: 400 })
      }
      where.id = { in: ids }
    } else {
      where.isActive = true
    }

    const products = (await prisma.product.findMany({
      where,
      orderBy: { id: "asc" },
      select: EXPORT_PRODUCT_SELECT,
    })) as unknown as ExportProduct[]

    const templateBuf = await fs.readFile(TEMPLATE_PATH)
    const zip = await JSZip.loadAsync(templateBuf)
    const sheetFile = zip.file(SHEET_XML_PATH)
    if (!sheetFile) {
      return NextResponse.json({ message: "Trendyol şablon dosyası bulunamadı veya bozuk." }, { status: 500 })
    }
    const xml = await sheetFile.async("string")

    const sheetDataMatch = xml.match(/<sheetData>([\s\S]*?)<\/sheetData>/)
    if (!sheetDataMatch) {
      return NextResponse.json({ message: "Trendyol şablonu beklenmedik formatta." }, { status: 500 })
    }
    const headerRowMatch = sheetDataMatch[1].match(/<row r="1">[\s\S]*?<\/row>/)
    const headerRowXml = headerRowMatch ? headerRowMatch[0] : ""

    // Şablonun kendi kategori kodunu (Elbise için "1182", D2 hücresi) koru — her satırda aynı kod kullanılacak.
    const catMatch = sheetDataMatch[1].match(/<c r="D2"[^>]*><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/)
    const templateCategoryCode = catMatch ? catMatch[1] : ""

    const rowsXml: string[] = []
    let rowIndex = 2
    for (const p of products) {
      for (const v of p.variants) {
        const row = buildRow(p, v, multiplier)

        const cells: string[] = []
        cells.push(textCell(`${colLetter(COL.barkod)}${rowIndex}`, row.barkod))
        cells.push(textCell(`${colLetter(COL.modelKodu)}${rowIndex}`, row.modelKodu))
        cells.push(textCell(`${colLetter(COL.marka)}${rowIndex}`, BRAND_NAME))
        cells.push(textCell(`${colLetter(COL.kategori)}${rowIndex}`, templateCategoryCode))
        cells.push(textCell(`${colLetter(COL.paraBirimi)}${rowIndex}`, "TRY"))
        cells.push(textCell(`${colLetter(COL.urunAdi)}${rowIndex}`, row.urunAdi))
        cells.push(textCell(`${colLetter(COL.aciklama)}${rowIndex}`, row.aciklama))
        cells.push(numberCell(`${colLetter(COL.piyasaFiyat)}${rowIndex}`, row.piyasaFiyat))
        cells.push(numberCell(`${colLetter(COL.satisFiyat)}${rowIndex}`, row.satisFiyat))
        cells.push(numberCell(`${colLetter(COL.stokAdedi)}${rowIndex}`, row.stokAdedi))
        cells.push(textCell(`${colLetter(COL.stokKodu)}${rowIndex}`, row.stokKodu))
        cells.push(numberCell(`${colLetter(COL.kdv)}${rowIndex}`, row.kdv))
        row.images.slice(0, 8).forEach((url, i) => {
          cells.push(textCell(`${colLetter(COL.gorselBaslangic + i)}${rowIndex}`, url))
        })
        cells.push(textCell(`${colLetter(COL.beden)}${rowIndex}`, row.beden))
        cells.push(textCell(`${colLetter(COL.webColor)}${rowIndex}`, row.webColor))
        cells.push(textCell(`${colLetter(COL.yasGrubu)}${rowIndex}`, YAS_GRUBU_DEFAULT))
        cells.push(textCell(`${colLetter(COL.kalip)}${rowIndex}`, BELIRTILMEMIS))
        cells.push(textCell(`${colLetter(COL.kumasTipi)}${rowIndex}`, BELIRTILMEMIS))
        cells.push(textCell(`${colLetter(COL.mensei)}${rowIndex}`, MENSEI_DEFAULT))
        cells.push(textCell(`${colLetter(COL.renk)}${rowIndex}`, row.renk))
        cells.push(textCell(`${colLetter(COL.boy)}${rowIndex}`, BELIRTILMEMIS))

        rowsXml.push(`<row r="${rowIndex}">${cells.join("")}</row>`)
        rowIndex++
      }
    }

    // İlk kez Trendyol'a gönderilen varyantların ürettiğimiz barkodunu kalıcı hale getir —
    // Trendyol'a bildirdiğimiz değer bundan sonra sabit kalsın (stok senkronizasyonu bu alana bakıyor).
    // Her yazı bağımsız ve tekrar çalıştırılabilir (idempotent) olduğu için tek bir büyük
    // `$transaction` yerine `Promise.all` kullanıyoruz — 900+ satırlık toplu exportlarda
    // Prisma'nın varsayılan transaction süresini (5sn) aşıp "Excel oluşturulurken hata oluştu"
    // hatasına yol açıyordu.
    const newBarcodes = products.flatMap((p) =>
      p.variants.filter((v) => !v.barcode).map((v) => ({ id: v.id, barcode: generateBarcode(v.id) }))
    )
    if (newBarcodes.length > 0) {
      await Promise.all(
        newBarcodes.map(({ id, barcode }) => prisma.productVariant.update({ where: { id }, data: { barcode } }))
      )
    }

    const lastRow = Math.max(rowIndex - 1, 2)
    const newSheetData = `<sheetData>${headerRowXml}${rowsXml.join("")}</sheetData>`
    let newXml = xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, newSheetData)
    newXml = newXml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:BU${lastRow}"/>`)

    zip.file(SHEET_XML_PATH, newXml)
    const outBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })

    const filename = `trendyol-urunler-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(outBuf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Trendyol export error:", error)
    return NextResponse.json({ message: "Excel oluşturulurken hata oluştu." }, { status: 500 })
  }
}
