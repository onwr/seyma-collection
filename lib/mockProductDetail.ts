import {
  mapApiProductToDetailViewModel,
  type ProductDetailViewModel,
} from "@/lib/productDetailShape"

const mockProductSource = [
  {
    id: 1,
    slug: "ekru-body-ve-bej-kemer-detayli-etek",
    name: "4-12 Yaş Ekru Body & Bej Kemer Detaylı Etek (Toka Hediyeli)",
    category: { name: "Kız Çocuk" },
    basePrice: 949.9,
    attributes: {
      Marka: "Little Mom's Store",
      Sezon: "İlkbahar / Yaz",
      "Üretim Yeri": "Türkiye",
      "Yaka Tipi": "Bisiklet Yaka",
      "Kumaş Türü": "Pamuk Karışım",
    },
    images: [
      { url: "/urunler/urun1.jpg", alt: "Ekru body ve etek takım ön görünüm" },
      { url: "/urunler/urun2.jpg", alt: "Ekru body ve etek takım yakın plan" },
      { url: "/urunler/urun3.jpg", alt: "Takımın yandan görünümü" },
      { url: "/urunler/urun4.jpg", alt: "Takım detay görünümü" },
    ],
    variants: [
      {
        id: 401,
        name: "4-5 Yaş",
        sku: "LMS-EKB-45",
        price: 949.9,
        stock: 5,
        attributes: { Renk: "Ekru - Bej", Kalıp: "Standart", Uzunluk: "Midi" },
      },
      {
        id: 402,
        name: "6-7 Yaş",
        sku: "LMS-EKB-67",
        price: 949.9,
        stock: 7,
        attributes: { Renk: "Ekru - Bej", Kalıp: "Rahat", Uzunluk: "Midi" },
      },
      {
        id: 403,
        name: "8-9 Yaş",
        sku: "LMS-EKB-89",
        price: 979.9,
        stock: 3,
        attributes: { Renk: "Ekru - Bej", Kalıp: "Rahat", Uzunluk: "Midi+" },
      },
      {
        id: 404,
        name: "10-12 Yaş",
        sku: "LMS-EKB-1012",
        price: 999.9,
        stock: 2,
        attributes: { Renk: "Ekru - Bej", Kalıp: "Rahat", Uzunluk: "Uzun Midi" },
      },
    ],
  },
]

export function getMockProductDetailBySlug(slug: string): ProductDetailViewModel | null {
  const source =
    mockProductSource.find((item) => item.slug === slug) ??
    mockProductSource[0]
  if (!source) {
    return null
  }

  const vm = mapApiProductToDetailViewModel(source, {
    phoneOrderLabel: "Telefonla Sipariş Ver",
  })

  return {
    ...vm,
    accordions: [
      {
        id: "features",
        title: "Ürün Özellikleri",
        content: [
          "Takım içeriği: 1 adet body, 1 adet etek, 1 adet toka.",
          "Kumaş türü: Esnek dokuma ve pamuk karışım.",
          "Yıkama önerisi: 30°C hassas yıkama, ağartıcı kullanmayın.",
          ...vm.baseAttributes.map((attr) => `${attr.key}: ${attr.value}`),
        ].join("\n"),
      },
      {
        id: "comments",
        title: "Yorumlar (0)",
        content:
          "Henüz yorum bulunmuyor. Ürünü satın aldıktan sonra ilk yorumu sen bırakabilirsin.",
      },
      {
        id: "payment",
        title: "Ödeme Seçenekleri",
        content: [
          "Kredi Kartı ile tek çekim ve taksitli ödeme yapılabilir.",
          ...vm.installmentOptions.map(
            (item) => `${item.months} taksit: ${item.monthlyAmountText}`
          ),
        ].join("\n"),
      },
    ],
  }
}
