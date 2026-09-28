/**
 * Utility functions for Exception-Based Priest Availability System.
 * 
 * Default Working Hours: 07:00 AM to 09:00 PM (Every day for 90 days).
 * Available Windows = [07:00 - 21:00] MINUS [Leaves] MINUS [Blackouts] MINUS [Bookings].
 */

export interface PriestException {
  id: string;
  priestId: string;
  date: string; // YYYY-MM-DD
  type: 'FULL_DAY_LEAVE' | 'PARTIAL_BLACKOUT';
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  reason?: string;
  createdAt: string;
}

export interface CalculatedSlot {
  id: string;
  priestId: string;
  slotDate: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: 'AVAILABLE' | 'BOOKED';
}

interface TimeInterval {
  start: number; // Minutes from 00:00
  end: number;   // Minutes from 00:00
}

/** Convert "HH:MM" (e.g. "07:30") to total minutes from midnight */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/** Convert minutes from midnight back to "HH:MM" 24-hr string */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Format time to 12-hour AM/PM string */
export function formatTimeAmPm(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes ? `:${minutes.toString().padStart(2, '0')}` : ':00';
  return `${displayHours}${displayMinutes} ${period}`;
}

/**
 * Interval Subtraction:
 * Subtracts busy intervals from free intervals.
 */
export function subtractTimeIntervals(
  freeIntervals: TimeInterval[],
  busyIntervals: TimeInterval[]
): TimeInterval[] {
  let result = [...freeIntervals];

  for (const busy of busyIntervals) {
    const nextResult: TimeInterval[] = [];

    for (const free of result) {
      // 1. No overlap
      if (busy.end <= free.start || busy.start >= free.end) {
        nextResult.push(free);
        continue;
      }

      // 2. Left portion remaining
      if (busy.start > free.start) {
        nextResult.push({ start: free.start, end: Math.min(busy.start, free.end) });
      }

      // 3. Right portion remaining
      if (busy.end < free.end) {
        nextResult.push({ start: Math.max(busy.end, free.start), end: free.end });
      }
    }

    result = nextResult;
  }

  return result.filter((interval) => interval.end > interval.start);
}

/**
 * Client-Side Persistence Helpers (localStorage)
 */
const STORAGE_PREFIX = 'pujacircle_priest_exceptions_';

export function getPriestExceptions(priestId: string): PriestException[] {
  if (!priestId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${priestId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePriestException(exception: PriestException): void {
  if (!exception.priestId) return;
  const current = getPriestExceptions(exception.priestId);
  const updated = [...current.filter((e) => e.id !== exception.id), exception];
  localStorage.setItem(`${STORAGE_PREFIX}${exception.priestId}`, JSON.stringify(updated));
}

export function deletePriestException(priestId: string, exceptionId: string): void {
  if (!priestId) return;
  const current = getPriestExceptions(priestId);
  const updated = current.filter((e) => e.id !== exceptionId);
  localStorage.setItem(`${STORAGE_PREFIX}${priestId}`, JSON.stringify(updated));
}

/**
 * Dynamically computes available Muhurat slots for a given date:
 * Default: 07:00 to 21:00 (14 hours)
 * Minused by: Full Day Leaves, Partial Blackouts, and Confirmed Bookings.
 */
export function calculateDayMuhuratSlots(
  priestId: string,
  targetDate: string,
  exceptions: PriestException[],
  bookings: any[] = [],
  slotDurationMinutes: number = 120 // 2-hour standard puja slots
): CalculatedSlot[] {
  // Check full day leave
  const dayExceptions = exceptions.filter((e) => e.date === targetDate);
  const hasFullLeave = dayExceptions.some((e) => e.type === 'FULL_DAY_LEAVE');
  if (hasFullLeave) {
    return [];
  }

  // Base working window: 07:00 AM (420 mins) to 09:00 PM (1260 mins)
  const baseWindow: TimeInterval[] = [{ start: 7 * 60, end: 21 * 60 }];

  // Collect busy intervals
  const busyList: TimeInterval[] = [];

  // 1. Partial blackouts
  dayExceptions
    .filter((e) => e.type === 'PARTIAL_BLACKOUT' && e.startTime && e.endTime)
    .forEach((e) => {
      busyList.push({
        start: timeToMinutes(e.startTime!),
        end: timeToMinutes(e.endTime!),
      });
    });

  // 2. Confirmed bookings for this date
  bookings
    .filter(
      (b) =>
        b.bookingDate === targetDate &&
        b.status !== 'CANCELLED' &&
        b.status !== 'REJECTED' &&
        b.startTime &&
        b.endTime
    )
    .forEach((b) => {
      busyList.push({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      });
    });

  // Subtract busy windows
  const freeWindows = subtractTimeIntervals(baseWindow, busyList);

  // Divide into standard Muhurat slots
  const slots: CalculatedSlot[] = [];
  freeWindows.forEach((window) => {
    let currentStart = window.start;
    while (currentStart + slotDurationMinutes <= window.end) {
      const startStr = minutesToTime(currentStart);
      const endStr = minutesToTime(currentStart + slotDurationMinutes);
      slots.push({
        id: `dyn-${targetDate}-${startStr}-${endStr}`,
        priestId,
        slotDate: targetDate,
        date: targetDate,
        startTime: startStr,
        endTime: endStr,
        status: 'AVAILABLE',
      });
      currentStart += slotDurationMinutes;
    }
  });

  return slots;
}

/**
 * Special Event / Wedding Advance Slots
 */
export interface SpecialSlot {
  id: string;
  priestId: string;
  ceremonyName: string; // e.g. "Grand Wedding (Vivah Sanskar)"
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  note?: string;        // e.g. "Includes Mandap Puja & Saptapadi"
  approxPrice?: number;
  createdAt: string;
}

const SPECIAL_SLOTS_PREFIX = 'pujacircle_special_slots_';

export function getSpecialSlots(priestId: string): SpecialSlot[] {
  if (!priestId) return [];
  try {
    const raw = localStorage.getItem(`${SPECIAL_SLOTS_PREFIX}${priestId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSpecialSlot(slot: SpecialSlot): void {
  if (!slot.priestId) return;
  const current = getSpecialSlots(slot.priestId);
  const updated = [...current.filter((s) => s.id !== slot.id), slot];
  localStorage.setItem(`${SPECIAL_SLOTS_PREFIX}${slot.priestId}`, JSON.stringify(updated));
}

export function deleteSpecialSlot(priestId: string, slotId: string): void {
  if (!priestId) return;
  const current = getSpecialSlots(priestId);
  const updated = current.filter((s) => s.id !== slotId);
  localStorage.setItem(`${SPECIAL_SLOTS_PREFIX}${priestId}`, JSON.stringify(updated));
}

