"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Barcode from "react-barcode"

/**
 * Yatay termal etiket:
 * 50mm genişlik × 30mm yükseklik
 */
const LABEL_W_MM = 50
const LABEL_H_MM = 30

type PrintSettings = {
  nameFont: number
  priceFont: number
  barcodeWidth: number
  barcodeHeight: number
  barcodeTextFont: number
  paddingX: number
  paddingY: number
  nameHeight: number
  barcodeAreaHeight: number
  priceHeight: number
}

const defaultSettings: PrintSettings = {
  nameFont: 8,
  priceFont: 12,
  barcodeWidth: 1,
  barcodeHeight: 34,
  barcodeTextFont: 8,
  paddingX: 1.5,
  paddingY: 1,
  nameHeight: 5,
  barcodeAreaHeight: 18,
  priceHeight: 5,
}

function PrintBarcodesContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings)

  useEffect(() => {
    const saved = localStorage.getItem("barcode-print-settings")
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("barcode-print-settings", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const ids = searchParams.get("ids")
    const variantIds = searchParams.get("variantIds")

    if (!ids && !variantIds) {
      setLoading(false)
      return
    }

    const query = ids ? `ids=${ids}` : `variantIds=${variantIds}`

    fetch(`/api/admin/products/barcodes?${query}`)
      .then((r) => r.json())
      .then((data) => {
        const flatItems: any[] = []

        ;(data.items || []).forEach((p: any) => {
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              flatItems.push({
                id: `v-${v.id}`,
                name: `${p.name} - ${v.name}`,
                sku: v.sku || p.sku,
                barcode: v.barcode || p.barcode,
                price: v.price || p.basePrice,
              })
            })
          } else {
            flatItems.push({
              id: `p-${p.id}`,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode,
              price: p.basePrice,
            })
          }
        })

        const valid = flatItems.filter((item) => item.barcode || item.sku)

        setProducts(valid)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [searchParams])

  const updateSetting = (key: keyof PrintSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  const sanitizeBarcode = (val: string) => {
    return String(val || "")
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C")
      .replace(/[^\x00-\x7F]/g, "")
      .trim()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-400">
        Barkodlar hazırlanıyor...
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-400">
        Yazdırılacak ürün bulunamadı.
      </div>
    )
  }

  return (
    <>
      <div className="no-print fixed left-4 top-4 z-50 w-[320px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-zinc-900">Barkod Baskı Ayarları</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Önizlemeye göre ayarla, sonra yazdır.
          </p>
        </div>

        <div className="space-y-3">
          <RangeInput
            label="Ürün adı yazısı"
            value={settings.nameFont}
            min={5}
            max={14}
            step={0.5}
            onChange={(v) => updateSetting("nameFont", v)}
          />

          <RangeInput
            label="Fiyat yazısı"
            value={settings.priceFont}
            min={7}
            max={22}
            step={0.5}
            onChange={(v) => updateSetting("priceFont", v)}
          />

          <RangeInput
            label="Barkod kalınlığı"
            value={settings.barcodeWidth}
            min={0.5}
            max={2}
            step={0.05}
            onChange={(v) => updateSetting("barcodeWidth", v)}
          />

          <RangeInput
            label="Barkod yüksekliği"
            value={settings.barcodeHeight}
            min={18}
            max={60}
            step={1}
            onChange={(v) => updateSetting("barcodeHeight", v)}
          />

          <RangeInput
            label="Barkod numarası yazısı"
            value={settings.barcodeTextFont}
            min={5}
            max={14}
            step={0.5}
            onChange={(v) => updateSetting("barcodeTextFont", v)}
          />

          <RangeInput
            label="Yan boşluk"
            value={settings.paddingX}
            min={0}
            max={4}
            step={0.1}
            suffix="mm"
            onChange={(v) => updateSetting("paddingX", v)}
          />

          <RangeInput
            label="Üst-alt boşluk"
            value={settings.paddingY}
            min={0}
            max={4}
            step={0.1}
            suffix="mm"
            onChange={(v) => updateSetting("paddingY", v)}
          />

          <RangeInput
            label="Ürün adı alanı"
            value={settings.nameHeight}
            min={3}
            max={9}
            step={0.5}
            suffix="mm"
            onChange={(v) => updateSetting("nameHeight", v)}
          />

          <RangeInput
            label="Barkod alanı"
            value={settings.barcodeAreaHeight}
            min={12}
            max={23}
            step={0.5}
            suffix="mm"
            onChange={(v) => updateSetting("barcodeAreaHeight", v)}
          />

          <RangeInput
            label="Fiyat alanı"
            value={settings.priceHeight}
            min={3}
            max={8}
            step={0.5}
            suffix="mm"
            onChange={(v) => updateSetting("priceHeight", v)}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetSettings}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Sıfırla
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Yazdır
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-500">
          Yazdırırken: <b>50x30mm</b>, <b>Yatay</b>, <b>Kenar boşluğu yok</b>,{" "}
          <b>Ölçek 100</b>, <b>Üstbilgi/altbilgi kapalı</b>.
        </div>
      </div>

      <div
        className="barcode-stack"
        style={
          {
            "--name-font": `${settings.nameFont}px`,
            "--price-font": `${settings.priceFont}px`,
            "--padding-x": `${settings.paddingX}mm`,
            "--padding-y": `${settings.paddingY}mm`,
            "--name-height": `${settings.nameHeight}mm`,
            "--barcode-area-height": `${settings.barcodeAreaHeight}mm`,
            "--price-height": `${settings.priceHeight}mm`,
          } as React.CSSProperties
        }
      >
        {products.map((product) => {
          const rawValue = product.barcode || product.sku
          const barcodeValue = sanitizeBarcode(rawValue)

          return (
            <div key={product.id} className="barcode-label">
              <div className="barcode-name">{product.name}</div>

              <div className="barcode-area">
                <Barcode
                  value={barcodeValue}
                  format="CODE128"
                  width={settings.barcodeWidth}
                  height={settings.barcodeHeight}
                  fontSize={settings.barcodeTextFont}
                  margin={0}
                  displayValue={true}
                />
              </div>

              <div className="barcode-price">
                ₺{Number(product.price || 0).toLocaleString("tr-TR")}
              </div>
            </div>
          )
        })}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #f4f4f5;
            }

            .barcode-stack {
              width: ${LABEL_W_MM}mm;
              margin: 0 auto;
              padding: 24px 0;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .barcode-label {
              width: ${LABEL_W_MM}mm;
              height: ${LABEL_H_MM}mm;
              background: #ffffff;
              border: 1px solid #e4e4e7;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              padding: var(--padding-y) var(--padding-x);
            }

            .barcode-name {
              width: 100%;
              height: var(--name-height);
              max-height: var(--name-height);
              overflow: hidden;
              font-size: var(--name-font);
              line-height: 1.05;
              font-weight: 800;
              color: #18181b;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            .barcode-area {
              width: 100%;
              height: var(--barcode-area-height);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .barcode-area svg {
              max-width: 100% !important;
              height: auto !important;
              display: block;
            }

            .barcode-price {
              width: 100%;
              height: var(--price-height);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: var(--price-font);
              line-height: 1;
              font-weight: 900;
              color: #09090b;
            }

            @media print {
              @page {
                size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm;
                margin: 0;
              }

              html,
              body {
                width: ${LABEL_W_MM}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .no-print,
              header,
              footer,
              nav,
              aside {
                display: none !important;
              }

              .barcode-stack {
                width: ${LABEL_W_MM}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                gap: 0 !important;
                display: block !important;
              }

              .barcode-label {
                width: ${LABEL_W_MM}mm !important;
                height: ${LABEL_H_MM}mm !important;
                min-height: ${LABEL_H_MM}mm !important;
                max-height: ${LABEL_H_MM}mm !important;
                margin: 0 !important;
                border: none !important;
                overflow: hidden !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .barcode-label:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `,
        }}
      />
    </>
  )
}

function RangeInput({
  label,
  value,
  min,
  max,
  step,
  suffix = "px",
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700">
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

export default function PrintBarcodesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-zinc-400">
          Yükleniyor...
        </div>
      }
    >
      <PrintBarcodesContent />
    </Suspense>
  )
}
