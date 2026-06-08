import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAptInitials(aptNumber: string): string {
  return aptNumber.toUpperCase()
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ca-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function generateSlots(
  from: string,
  until: string,
  durationMinutes: number
): { start: string; end: string }[] {
  const slots = []
  let current = timeToMinutes(from)
  const end = timeToMinutes(until)
  while (current + durationMinutes <= end) {
    slots.push({
      start: minutesToTime(current),
      end: minutesToTime(current + durationMinutes),
    })
    current += durationMinutes
  }
  return slots
}

export function validateAptNumber(aptNumber: string): boolean {
  // Format: floor (1-9) + door (A-J)
  return /^[1-9][A-Ja-j]$/.test(aptNumber)
}

export function parseAptNumber(aptNumber: string): { floor: number; door: string } | null {
  const match = aptNumber.match(/^([1-9])([A-Ja-j])$/i)
  if (!match) return null
  return { floor: parseInt(match[1]), door: match[2].toUpperCase() }
}

export function isDuplexFloor(floor: number, duplexFloors: number[]): boolean {
  return duplexFloors.includes(floor)
}

export function getDuplexUpperNumber(aptNumber: string): string {
  const parsed = parseAptNumber(aptNumber)
  if (!parsed || parsed.floor !== 8) return aptNumber
  return `9${parsed.door}`
}

export const INTERESTS = [
  'Tennis', 'Padel', 'Swimming', 'Football', 'Basketball',
  'Cycling', 'Chess', 'SUP / Beach', 'Music', 'Dogs',
  'Cooking', 'Language exchange',
]

export const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social events',
  infrastructure: 'Infrastructure',
  rules: 'Rules & conduct',
  complaint: 'Complaint',
  project: 'New project',
  meeting: 'Meeting request',
  other: 'Other',
}

export const MARKETPLACE_CATEGORY_LABELS: Record<string, string> = {
  favour: 'Favour & help',
  advice: 'Neighbour advice',
  borrow: 'Borrow',
  buy_sell_donate: 'Buy / Sell / Donate',
  parking: 'Parking',
  apartment_rental: 'Apartment rental',
  apartment_sale: 'Apartment for sale',
  babysitting: 'Babysitting',
  language_exchange: 'Language exchange',
}

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  common_areas: 'Common areas',
  pool_garden: 'Pool / garden (Moha)',
  elevator: 'Elevator',
  parking: 'Parking / basement',
  structure: 'Building structure',
  noise: 'Noise / neighbour issue',
  insurance: 'Insurance claim',
  internal: 'Internal apartment issue',
  other: 'Other',
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  tendering: 'Tendering',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
}

export const LANGUAGES: Record<string, string> = {
  CA: 'Català',
  ES: 'Castellano',
  EN: 'English',
  FR: 'Français',
  RU: 'Русский',
  PT: 'Português',
  IT: 'Italiano',
  DE: 'Deutsch',
  NL: 'Nederlands',
  UK: 'Українська',
  SR: 'Српски',
  HI: 'हिन्दी',
}
