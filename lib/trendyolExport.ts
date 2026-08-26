// Trendyol "Elbise" şablonu için ortak veri hazırlama mantığı.
// Hem xlsx üreten route hem de indirmeden önceki "kontrol et" route'u bu dosyayı kullanır,
// böylece ikisi arasında sütun eşlemesi/varsayılan değerler asla birbirinden sapmaz.

export const BRAND_NAME = "Little Mom's Store"

// 1-indexli sütun numaraları — şablondaki sütun sırasıyla birebir eşleşmeli.
export const COL = {
  barkod: 1,
  modelKodu: 2,
  marka: 3,
  kategori: 4,
  paraBirimi: 5,
  urunAdi: 6,
  aciklama: 7,
  piyasaFiyat: 8,
  satisFiyat: 9,
  stokAdedi: 10,
  stokKodu: 11,
  kdv: 12,
  gorselBaslangic: 16, // Görsel 1..8 -> 16..23
  beden: 26,
  webColor: 28,
  yasGrubu: 32,
  kalip: 47,
  kumasTipi: 48,
  mensei: 57,
  renk: 60,
  boy: 70,
}

// Trendyol şablonunda başlığı KALIN (bold) yazılan sütunlar zorunlu alanlardır.
// Bu alanların çoğu bizim veritabanımızda karşılığı olmayan Trendyol'a özel zorunlu alanlar —
// gerçek veri yerine güvenli/sabit varsayılanlar kullanıyoruz (kullanıcı onayıyla).
export const YAS_GRUBU_DEFAULT = "Bebek & Çocuk"
export const MENSEI_DEFAULT = "TR" // Türkiye
export const BELIRTILMEMIS = "Belirtilmemiş" // Kalıp / Kumaş Tipi / Boy için geçerli, veri olmadığını belirten resmi seçenek
export const COLOR_FALLBACK = "Çok Renkli" // Hiçbir yerde renk bilgisi bulunamayan ürünler için son çare

// Trendyol'un "Web Color" alanı için resmi 26 seçenekli liste (Urun_Ozellik_Bilgileri!B2:B27) —
// serbest metin "Renk" değerini bu listedeki karşılığına eşliyoruz.
export const WEB_COLOR_OPTIONS = [
  "Altın", "Bej", "Beyaz", "Bordo", "Çok Renkli", "Ekru", "Gri", "Gümüş", "Haki", "Inox",
  "Kahverengi", "Kırmızı", "Krem", "Lacivert", "Mavi", "Metalik", "Mor",
  "Parmak İzi Bırakmaz Inox", "Parmak İzi Bırakmaz Koyu Inox", "Pembe", "Sarı", "Siyah",
  "Şeffaf", "Turkuaz", "Turuncu", "Yeşil",
]
const WEB_COLOR_LOOKUP = new Map(WEB_COLOR_OPTIONS.map((c) => [c.toLocaleLowerCase("tr"), c]))

export function matchWebColor(renk: string): string {
  if (!renk) return ""
  return WEB_COLOR_LOOKUP.get(renk.trim().toLocaleLowerCase("tr")) || ""
}

// Varyantta yapılandırılmış renk bilgisi yoksa, ürün adı/açıklamasında Trendyol'un
// resmi renk kelimelerinden biri geçiyor mu diye bakıyoruz (ör. "Pembe Pijama").
export function findColorInText(text: string): string {
  if (!text) return ""
  const lower = text.toLocaleLowerCase("tr")
  return WEB_COLOR_OPTIONS.find((option) => lower.includes(option.toLocaleLowerCase("tr"))) || ""
}

// Trendyol'un "Elbise" kategorisi Beden alanı (Urun_Ozellik_Bilgileri!V2:V755) — 754 seçenekli
// kapalı liste. Serbest metin girişlerimiz (ör. admin panelinde büyük harfle yazılmış "5-6 YAŞ")
// bu listedeki resmi yazımla (örn. "5-6 Yaş") birebir eşleşmediği için Trendyol "zorunlu kategori
// özellik bilgisi bulunamadı" hatası veriyordu — bu yüzden normalize edilmiş eşleştirme yapıyoruz.
export const BEDEN_OPTIONS = [
  "0", "1", "2", "3", "4", "5", "6", "6.5", "7", "7L", "8", "9", "10", "11", "12", "13", "14",
  "15", "16", "17", "18", "19", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33",
  "34", "35", "36", "37", "38", "39", "40", "42", "44", "45", "46", "48", "48D", "49", "50", "51",
  "52", "54", "56", "57", "58", "60", "62", "64", "66", "70F", "70D", "75F", "75D", "79", "80F",
  "80D", "80", "85F", "85D", "86", "90F", "90D", "90", "92", "95F", "95D", "98", "100", "100D",
  "104", "105D", "110", "114", "116", "120", "122", "128", "134", "140", "146", "150", "152",
  "155", "158", "160", "164", "165", "180", "220", "280", "300", "380", "395", "1030", "1218",
  "1614", "1629", "1829", "1830", "2223", "3031", "3033", "4429", "0,75", "0,75 L", "0 - 12 Ay",
  "0-18 Ay", "0-1 Ay", "0-1 Yaş", "0-2 Ay", "0-2 Yaş", "0-3 AY", "0-3 Yaş", "0-4 AY", "0-4 Yaş",
  "0-6 Ay", "0-6 Yaş", "0-9 Ay", "0 AY", "1,5-2,5 Yaş", "1,5 - 2 Yaş", "1,5 cm", "1/SMALL",
  "1.5-2 Yaş", "10,5", "10/11", "100B", "100C", "100 gr", "100 x 190", "100 x 450", "10-11 Yaş",
  "10-12 Yaş", "10-14", "104/110", "104/140", "105B", "105C", "10 cm", "10 kg", "10 oz", "10SHT",
  "10 Yaş", "11,5", "1-1,5 Yaş", "110C", "110 x 110", "11-12 Yaş", "11-13 Yaş", "11-14 Yaş",
  "116/122", "11 Yaş", "1-2", "12,5", "12/13", "12+", "120 x 250", "12-13 Yaş", "12-14STD",
  "12-14 Yaş", "12-15 AY", "12-15 Yaş", "12-18 AY", "122/128", "125 ml", "128/134", "12 Ay",
  "1-2 AY", "12MED", "12 oz", "12 Yaş", "1-2 Yaş", "13,5", "130 CM", "13-14 Yaş", "13-15 Yaş",
  "1-3 AY", "13 Yaş", "1-3 Yaş", "14/15", "140/146", "140 x 140", "14-15 Yaş", "145 CM",
  "146-152", "14STD", "14 Yaş", "1-4 Yaş", "150 CM", "150 x 190", "150 x 200", "150 x 250",
  "15-16 Yaş", "15-18 Ay", "155 CM", "157 cm", "15 Ay", "15 Cm", "15 YAŞ", "16/17", "160x200",
  "160x220", "160 x 240", "160x250", "16-17", "16-17 Yaş", "16-18", "16-18SHT", "165x235",
  "16 cm", "16 YAŞ", "170/176 cm", "17 Yaş", "18,5", "180 cm", "180x200", "18 - 19", "18-20",
  "18 - 21", "18-24 AY", "18-36 Ay", "18 Ay", "18STD", "18 Yaş", "19,5", "19-20", "19-21",
  "19-22", "195 x 300", "1 Ay", "1 Yaş", "2,5-3 Yaş", "2/X", "20,5", "200 x 220", "20-21",
  "20-22", "20 cm", "20REG", "20STD", "21-22", "21-23", "2-2,5 Yaş", "22/28", "22/30", "22/32",
  "22/36", "22-23", "22-24", "22LNG", "22REG", "22STD", "2-3", "23,5", "23/30", "23/31", "23/32",
  "23/33", "23-24", "23 - 28", "2-3 Ay", "2-3 Yaş", "24,5", "24/27", "24/28", "24/29", "24/30",
  "24/31", "24/32", "24/33", "24/36", "24/38", "24/40", "240 x 260", "24-25", "24-26",
  "24-26STD", "24-32 Ay", "24-36 Ay", "24 Ay", "2-4 Ay", "24LNG", "24MED", "24REG", "2-4 Yaş",
  "25,5", "25/27", "25/28", "25/29", "25/30", "25/31", "25/32", "25/33", "25/34", "25/35",
  "25/36", "25-26", "25-29", "2-5 Yaş", "26,5", "26/25", "26/26", "26/27", "26/28", "26/29",
  "26/30", "26/31", "26/32", "26/33", "26/34", "26/35", "26/38", "26-27", "26-28", "26LNG",
  "2-6 Yaş", "27,5", "27/25", "27/26", "27/27", "27/33", "27/34", "27/35", "27/36", "27-29",
  "27-30", "27-31", "27-32", "27-6 DROP", "27 REG", "28,5", "28/25", "28/26", "28/27", "28/28",
  "28/30", "28/31", "28/32", "28/33", "28/34", "28/35", "28/36", "28-29", "28SHT", "29,5",
  "29/25", "29/26", "29/27", "29/28", "29/29", "29/33", "29/35", "29/36", "29-31", "29-34",
  "29 REG", "2 Ay", "2X", "2x3", "2XL", "2XL/3XL", "2XL-3XL", "2XS", "2XS/XS", "2 Yaş", "3,5",
  "3,5 - 4 Yaş", "3/4", "30,5", "30/26", "30/27", "30/28", "30/29", "30/30", "30/31", "30/33",
  "30/34", "30/35", "30/36", "30-31", "30-33", "30-34", "30-35", "30B", "30C", "30 cm", "30 L",
  "30LNG", "31,5", "31/26", "31/27", "31/28", "31/29", "31/30", "31/31", "31/33", "31/34",
  "31/35", "31/36", "31/38", "3-12 Ay", "31-32", "31-33", "31-34", "31-36", "32,5", "32/26",
  "32/27", "32/28", "32/29", "32/31", "32/33", "32/34", "32/35", "32/36", "32/38", "32-33",
  "32-34", "32-35", "32A", "32 cm", "32SHT", "33,5", "33/26", "33/30", "33/31", "33/33",
  "33/35", "33/36", "33/38", "33-34", "33-35", "33-36", "34 /34", "34/36", "34/38", "34/SHT",
  "34-36", "3-4 Ay", "3-4 Yaş", "35/30", "35/32", "35/33", "35/34", "35/38", "35-36", "35-37",
  "35-38", "35-39", "35x35", "3-5 Yaş", "36/28", "36/32", "36/38", "36-37", "36-38", "36-39",
  "36 - 40", "3-6 AY", "36SHT", "3-6 Yaş", "37/30", "37/32", "37/40", "37 1/3", "37-38",
  "38/30", "38/34", "38/48", "38-40", "38-42", "38SHT", "3-8 Yaş", "39/34", "39/42", "39 1/3",
  "39-41", "39-42", "3 Ay", "3X", "3XL", "3XL/LNG", "3XL-4XL", "3XS", "3 Yaş", "4,5",
  "4,5 - 5,5 Yaş", "4/5", "40/42", "40/SHT", "40-43", "40-44", "40-46", "40SHT", "40 x 100",
  "40x80", "41 1/3", "41-42", "41-45", "41-46", "42/SHT", "42-44", "42-46", "43 1/3", "43-45",
  "4 - 4,5 Yaş", "44/SHT", "44-46", "4-5", "45,15", "45 1/3", "45-46", "45-47", "45 cm",
  "4-5 Yaş", "46/SHT", "46-48", "4-6 AY", "46 cm", "4-6 Yaş", "4-7", "47,15", "47-48",
  "4-7 Yaş", "4-8", "48/SHT", "48-50", "4-8 AY", "48 cm", "4 Ay", "4X", "4XL", "4XL-5XL",
  "4 Yaş", "5,5", "5,5 - 6,5 Yaş", "50/SHT", "500 gr", "50-52", "50-56", "50 kg", "50x100",
  "50x120", "51 CM", "52/30", "52/54", "52/58", "52/LNG", "52/SHT", "52-54", "52-7 Drop",
  "52-8 DROP", "53 CM", "54/REG", "54-56", "54 REG", "55 cm", "5-6", "56/58", "56/LNG",
  "56/REG", "56/SHT", "56-58", "56 REG", "5-6 Yaş", "5-7 Yaş", "58/REG", "58/SHT", "58-60",
  "5-8 Yaş", "5-9 Yaş", "5 Ay", "5 cm", "5 L", "5XL", "5XL/6XL", "5 Yaş", "6,5", "6,5 - 7,5 Yaş",
  "6,5 Yaş", "6/7", "60/LNG", "60/REG", "60/SHT", "6-12", "6-12 Ay", "6-12 Yaş", "6-18 Ay",
  "61 cm", "62-64", "64-66", "65A", "65C", "66-68", "6-7 Ay", "6-7 Yaş", "6-8+", "6-8 Yaş",
  "6-9", "6-9 AY", "6-9 Yaş", "6 Ay", "6MED", "6 oz", "6XL", "6 Yaş", "7,5", "7,5 kg", "70A",
  "70C", "70 cm", "70DD", "70E", "70G", "70 x 70", "7-10 Yaş", "7-12", "74/80 cm", "75B", "75C",
  "75 cm", "75E", "75G", "7-8", "7-8 Yaş", "7-9 Yaş", "7 kg", "7 Yaş", "8,5", "8/9", "80B",
  "80C", "80 cm", "80E", "80G", "80 x 150", "80x160", "80 x 180", "80 x 80", "8-10SHT",
  "8-10 Yaş", "8-12 AY", "8-12 Yaş", "82 cm", "85B", "85C", "85E", "85G", "87 cm", "8-9 Yaş",
  "8LNG", "8MED", "8REG", "8 Yaş", "9,5", "90A", "90B", "90C", "90E", "90G", "9-10 Yaş",
  "9-11 Yaş", "9-12", "9 - 12 Ay", "9-12 Yaş", "9-18 Ay", "92/98", "92 cm", "95B", "95C",
  "95 CM", "95E", "98-104 cm", "98 cm", "9 Ay", "9 Yaş", "Battal Standart", "Büyük Boy",
  "Grip L1", "Grip L4", "Küçük Boy", "L", "L/2XL", "L/30", "L/32", "L/S", "L/T", "L/XL", "M",
  "M/30", "M/L", "M/LNG", "M/P", "M/S", "M/T", "MSTD", "OSFL", "OSFM", "OSFW", "OSFY",
  "Prematüre", "REGL", "S", "S/32", "S/34", "S/36", "S/C", "S/L", "S/LNG", "S/M", "S/P", "S30",
  "SA/B", "S Geniş", "SMALL - 2/3 Yaş", "SMALL - 4/5 Yaş", "Standart", "T5", "T7", "T75",
  "TekEbat", "Tek Ebat", "X", "XL", "XL/16", "XL/2XL", "XL/32", "XL/L", "XL/LNG", "XL/P",
  "XL/T", "XL/XXXL", "XLSTD", "XL-XXL", "XS", "XS/P", "XS/S", "XS/T", "XS-S", "XXLLNG",
  "XXLSTD", "XXS", "XXXLLNG", "XXXXLLNG", "Yeni Doğan",
]

function normalizeBedenKey(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim()
}

const BEDEN_LOOKUP = new Map(BEDEN_OPTIONS.map((o) => [normalizeBedenKey(o), o]))
export const BEDEN_FALLBACK = "Standart"

/** Serbest metin bir beden değerini Trendyol'un resmi listesindeki karşılığına eşler. */
export function matchBeden(raw: string): string {
  if (!raw) return ""
  return BEDEN_LOOKUP.get(normalizeBedenKey(raw)) || ""
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Varyantların SKU'ları serbest metin (ör. "Lm-3836-5/6") olduğundan Trendyol'un
// "barcode.not.valid" hatasına yol açıyor — Trendyol Barkod alanının sayısal/EAN-13
// formatında olmasını istiyor. Gerçek bir GTIN barkodumuz olmadığından, varyant ID'sinden
// SABİT (her export'ta aynı ürün için hep aynı sonucu üreten) geçerli bir EAN-13 kodu
// türetiyoruz — GS1'in "kısıtlı dolaşım" (200-299) aralığını kullanıyoruz.
export function generateBarcode(variantId: number): string {
  const base = "200" + String(variantId).padStart(9, "0")
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return base + String(check)
}

function extractAttrs(attributesJson: string | null, variantName: string): { beden: string; renk: string } {
  if (attributesJson) {
    try {
      const parsed = JSON.parse(attributesJson)
      if (Array.isArray(parsed)) {
        // "Beden" için çocuk giyimde sık kullanılan Yaş/Age bazlı varyantları da say
        const beden = parsed.find((a: any) => /beden|size|yaş|age/i.test(String(a?.name ?? "")))?.option
        const renk = parsed.find((a: any) => /renk|colou?r/i.test(String(a?.name ?? "")))?.option
        if (beden || renk) {
          return { beden: beden ? String(beden) : "", renk: renk ? String(renk) : "" }
        }
      }
    } catch {
      // JSON parse edilemedi, aşağıdaki fallback'e düş
    }
  }
  // Bazı varyant adları "Numara: 18 . Renk: Pembe" / "Renk: Bej · Yaş: 7-8 Yaş" gibi BİRDEN FAZLA
  // etiketli parçayı nokta/orta nokta ile birleştiriyor — her etiketi ayrı ayrı arayıp
  // yakalıyoruz (parça sırası önemli değil, hangisi önce gelirse gelsin).
  const renkLabeled = /renk\s*:\s*([^.·]+)/i.exec(variantName || "")?.[1]?.trim()
  const bedenLabeled = /(?:yaş|beden|numara)\s*:\s*([^.·]+)/i.exec(variantName || "")?.[1]?.trim()
  if (renkLabeled || bedenLabeled) {
    return { beden: bedenLabeled || "", renk: renkLabeled || "" }
  }

  // Yapılandırılmış veri ya da etiket yoksa varyant adını Beden'e yaz — "Standart" da dahil,
  // çünkü Trendyol'un resmi Beden listesinde tam olarak bu isimde geçerli bir seçenek var
  // (tek bedenli/varyantsız ürünler için). "27 Numara" gibi sondan etiketli isimler de var —
  // resmi Beden listesinde ayakkabı numaraları sadece "27" gibi çıplak sayı olarak geçiyor.
  const cleanedName = (variantName || "").replace(/\s*numara\s*$/i, "").trim()

  // Bazı varyant adları renk+beden birleşik girilmiş (ör. "Bej 9-10 Yaş", "Siyah 7-8 Yaş") —
  // bunu ayrıştırmazsak Beden hiç eşleşmez ("Standart"a düşer, TÜM varyantlar aynı Standart
  // bedene toplanıp Trendyol'da "aynı beden zaten var" hatası verir) ve Renk de hep
  // varsayılana ("Çok Renkli") düşer. Resmi renk listesindeki bir kelime adın içinde geçiyorsa
  // onu ayıklayıp geri kalanını Beden adayı yapıyoruz.
  const colorInName = findColorInText(cleanedName)
  if (colorInName) {
    const lowerName = cleanedName.toLocaleLowerCase("tr")
    const lowerColor = colorInName.toLocaleLowerCase("tr")
    const idx = lowerName.indexOf(lowerColor)
    const remainder =
      idx >= 0 ? (cleanedName.slice(0, idx) + cleanedName.slice(idx + colorInName.length)).trim() : cleanedName
    return { beden: remainder || cleanedName, renk: colorInName }
  }

  return { beden: cleanedName, renk: "" }
}

export const EXPORT_PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  sku: true,
  trendyolProductMainId: true,
  compareAtPrice: true,
  taxRate: true,
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      trendyolListedAt: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      attributesJson: true,
    },
  },
}

export type ExportProduct = {
  id: number
  name: string
  description: string | null
  sku: string | null
  trendyolProductMainId: string | null
  compareAtPrice: unknown
  taxRate: number
  images: { url: string }[]
  variants: {
    id: number
    name: string
    sku: string
    barcode: string | null
    trendyolListedAt: Date | null
    price: unknown
    compareAtPrice: unknown
    stock: number
    attributesJson: string | null
  }[]
}

export interface RowWarning {
  field: "Ürün Açıklaması" | "Renk / Web Color" | "Beden"
  note: string
}

export interface BuiltRow {
  productId: number
  productName: string
  variantSku: string
  barkod: string
  modelKodu: string
  urunAdi: string
  aciklama: string
  piyasaFiyat: number
  satisFiyat: number
  stokAdedi: number
  stokKodu: string
  kdv: number
  images: string[]
  beden: string
  webColor: string
  renk: string
  warnings: RowWarning[]
}

export function buildRow(p: ExportProduct, v: ExportProduct["variants"][number], multiplier: number): BuiltRow {
  const warnings: RowWarning[] = []

  const realDescription = p.description ? stripHtml(p.description) : ""
  const description = realDescription || p.name
  if (!realDescription) {
    warnings.push({ field: "Ürün Açıklaması", note: "Açıklama girilmemiş, ürün adı kullanıldı." })
  }

  const { beden: rawBeden, renk: attrRenk } = extractAttrs(v.attributesJson, v.name)
  const nameOrDescColor = findColorInText(p.name) || findColorInText(description)
  const renk = attrRenk || nameOrDescColor || COLOR_FALLBACK
  if (!attrRenk && !nameOrDescColor) {
    warnings.push({ field: "Renk / Web Color", note: `Renk bilgisi bulunamadı, "${COLOR_FALLBACK}" varsayıldı.` })
  }

  const matchedBeden = matchBeden(rawBeden)
  const beden = matchedBeden || BEDEN_FALLBACK
  if (!matchedBeden) {
    warnings.push({
      field: "Beden",
      note: rawBeden
        ? `"${rawBeden}" Trendyol'un resmi beden listesiyle eşleşmedi, "${BEDEN_FALLBACK}" varsayıldı.`
        : `Beden bilgisi yok, "${BEDEN_FALLBACK}" varsayıldı.`,
    })
  }

  const compareBase = Number(v.compareAtPrice ?? p.compareAtPrice ?? v.price)
  const priceBase = Number(v.price)
  // Trendyol "satış fiyatı piyasa fiyatından büyük olamaz" kuralını uyguluyor — veritabanında
  // compareAtPrice, price'tan düşük girilmişse bile piyasaFiyat'ı en az satisFiyat kadar tutuyoruz.
  const piyasaFiyatBase = Math.max(compareBase, priceBase)

  return {
    productId: p.id,
    productName: p.name,
    variantSku: v.sku,
    // Kalıcı barkod varsa onu kullan (varyant ID değişse bile Trendyol eşleşmesi sabit kalsın) —
    // yoksa aynı deterministik algoritmayla üret; DB'ye yazma işini çağıran route yapar.
    barkod: v.barcode || generateBarcode(v.id),
    // Trendyol'da zaten kayıtlı bir ürünse (eski Excel yüklemesi vb.) GERÇEK productMainId'yi
    // kullan — yoksa kendi varsayılanımızı üretiriz.
    modelKodu: p.trendyolProductMainId || p.sku || `URUN-${p.id}`,
    urunAdi: p.name,
    aciklama: description,
    piyasaFiyat: round2(piyasaFiyatBase * multiplier),
    satisFiyat: round2(priceBase * multiplier),
    stokAdedi: v.stock,
    stokKodu: v.sku,
    kdv: p.taxRate,
    images: p.images.map((i) => i.url),
    beden,
    webColor: matchWebColor(renk),
    renk,
    warnings,
  }
}
