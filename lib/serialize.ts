/**
 * Prisma'nın döndürdüğü Decimal nesnelerini Client Component'lerin anlayabileceği
 * düz nesnelere (number veya string) dönüştürür.
 * Next.js Server Components -> Client Components geçişindeki "Only plain objects can be passed"
 * hatasını çözer.
 */

export function serializePrisma(data: any): any {
  if (data === null || data === undefined) return data

  // Array ise her elemanı gez
  if (Array.isArray(data)) {
    return data.map(item => serializePrisma(item))
  }

  // Obje ise içini gez
  if (typeof data === "object") {
    // Prisma Decimal kontrolü (Decimal.js nesneleri d, s, e, c gibi iç alanlara sahiptir)
    // Bazı durumlarda constructor name "Decimal2" veya başka bir şey olabilir.
    if (data.constructor && (
      data.constructor.name === "Decimal" || 
      data.constructor.name === "Decimal2" ||
      (data.d && data.s && data.e !== undefined)
    )) {
      return Number(data.toString())
    }

    // Date nesnesi ise ISO string'e çevir (İsteğe bağlı, Next.js Date'i destekler ama bazen sorun olabilir)
    if (data instanceof Date) {
      return data.toISOString()
    }

    const newObj: any = {}
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = serializePrisma(data[key])
      }
    }
    return newObj
  }

  return data
}
