import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hours come out as raw floats (e.g. 6.583333…). Show one decimal place,
// dropping it for whole numbers: "6.6h", "13.5h", "8h".
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
