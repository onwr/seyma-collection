import ilRaw from "./il.json"
import ilceRaw from "./ilce.json"

export interface City {
  id: number
  name: string
}

export interface District {
  id: number
  il_id: number
  name: string
}

type Table<T> = { type: "table"; name: string; database: string; data: T[] }

function tableData<T>(raw: unknown[]): T[] {
  const table = raw.find(
    (row): row is Table<T> => typeof row === "object" && row !== null && (row as { type?: string }).type === "table"
  )
  return table?.data ?? []
}

export const cities: City[] = tableData<{ id: string; name: string }>(ilRaw)
  .map((c) => ({ id: Number(c.id), name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "tr"))

const allDistricts: District[] = tableData<{ id: string; il_id: string; name: string }>(ilceRaw).map((d) => ({
  id: Number(d.id),
  il_id: Number(d.il_id),
  name: d.name,
}))

export function getDistrictsByCityId(cityId: number): District[] {
  return allDistricts
    .filter((d) => d.il_id === cityId)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
}
