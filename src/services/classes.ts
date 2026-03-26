import { store } from './dataStore';
import { Class, ClassType, Room } from '@/types';

const delay = () => new Promise(r => setTimeout(r, 100));
const generateId = () => `cls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getClasses(filters?: {
  date?: string;
  room?: Room;
  classType?: ClassType;
  instructorId?: string;
}): Promise<Class[]> {
  await delay();
  let result = store.classes;
  if (filters) {
    if (filters.date) result = result.filter(c => c.date === filters.date);
    if (filters.room) result = result.filter(c => c.room === filters.room);
    if (filters.classType) result = result.filter(c => c.classType === filters.classType);
    if (filters.instructorId) result = result.filter(c => c.instructorId === filters.instructorId);
  }
  return result;
}

/**
 * Expand recurring classes into weekly occurrences within a date range.
 * Non-recurring classes pass through if within range.
 * Recurring classes generate an occurrence for every matching weekday in range,
 * except dates listed in excludedDates.
 */
export function expandRecurringClasses(
  classes: Class[],
  startDate: string,
  endDate: string,
): Class[] {
  const result: Class[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  for (const cls of classes) {
    if (!cls.isRecurring) {
      // Non-recurring: include if within range
      if (cls.date >= startDate && cls.date <= endDate) {
        result.push(cls);
      }
    } else {
      // Recurring: generate weekly occurrences on the same day of week
      const baseDate = new Date(cls.date + 'T00:00:00');
      const dayOfWeek = baseDate.getDay();
      const excluded = new Set(cls.excludedDates);

      // Find first occurrence on or after max(startDate, baseDate) with same day of week
      const rangeStart = baseDate > start ? baseDate : start;
      const current = new Date(rangeStart);
      const startDow = current.getDay();
      const diff = ((dayOfWeek - startDow) % 7 + 7) % 7;
      current.setDate(current.getDate() + diff);

      while (current <= end) {
        const dateStr = formatDateStr(current);
        if (!excluded.has(dateStr)) {
          result.push({ ...cls, date: dateStr });
        }
        current.setDate(current.getDate() + 7);
      }
    }
  }

  return result;
}

export async function getClassById(id: string): Promise<Class | null> {
  await delay();
  return store.classes.find(c => c.id === id) ?? null;
}

export async function hasConflict(
  date: string,
  time: string,
  room: Room,
  excludeClassId?: string
): Promise<boolean> {
  await delay();
  // Check non-recurring classes directly
  const directConflict = store.classes.some(
    c =>
      !c.isRecurring &&
      c.date === date &&
      c.time === time &&
      c.room === room &&
      c.id !== excludeClassId
  );
  if (directConflict) return true;

  // Check recurring classes that would land on this date
  const targetDate = new Date(date + 'T00:00:00');
  const targetDow = targetDate.getDay();
  return store.classes.some(c => {
    if (!c.isRecurring) return false;
    if (c.id === excludeClassId) return false;
    if (c.time !== time || c.room !== room) return false;
    const baseDow = new Date(c.date + 'T00:00:00').getDay();
    if (baseDow !== targetDow) return false;
    if (c.excludedDates.includes(date)) return false;
    return true;
  });
}

export async function addClass(data: Omit<Class, 'id'>): Promise<Class> {
  const conflict = await hasConflict(data.date, data.time, data.room);
  if (conflict) {
    throw new Error(`Schedule conflict: ${data.room} is already booked at ${data.time} on ${data.date}`);
  }
  const newClass: Class = { id: generateId(), ...data };
  store.classes.push(newClass);
  return newClass;
}

export async function updateClass(id: string, data: Partial<Class>): Promise<Class | null> {
  await delay();
  const index = store.classes.findIndex(c => c.id === id);
  if (index === -1) return null;

  const updated = { ...store.classes[index], ...data, id };

  const conflict = store.classes.some(
    c =>
      c.date === updated.date &&
      c.time === updated.time &&
      c.room === updated.room &&
      c.id !== id
  );
  if (conflict) {
    throw new Error(`Schedule conflict: ${updated.room} is already booked at ${updated.time} on ${updated.date}`);
  }

  store.classes[index] = updated;
  return store.classes[index];
}

export async function cancelClass(id: string): Promise<{ cancelled: boolean; cancelledBookings: number }> {
  await delay();
  const index = store.classes.findIndex(c => c.id === id);
  if (index === -1) return { cancelled: false, cancelledBookings: 0 };

  store.classes.splice(index, 1);

  const bookingsToRemove = store.bookings.filter(b => b.classId === id);
  const cancelledBookings = bookingsToRemove.length;
  store.bookings = store.bookings.filter(b => b.classId !== id);

  return { cancelled: true, cancelledBookings };
}

/**
 * Extract a single occurrence from a recurring series.
 * Creates a new standalone (non-recurring) class for the given date,
 * copies all bookings (as non-recurring), and adds the date to the
 * original series' excludedDates.
 * Returns the new standalone class.
 */
export async function extractFromSeries(
  seriesId: string,
  occurrenceDate: string,
): Promise<Class> {
  await delay();
  const series = store.classes.find(c => c.id === seriesId);
  if (!series) throw new Error('Series not found');
  if (!series.isRecurring) throw new Error('Class is not recurring');

  // Create a new standalone class with same attributes but for this date
  const newClass: Class = {
    id: generateId(),
    title: series.title,
    classType: series.classType,
    instructorId: series.instructorId,
    room: series.room,
    date: occurrenceDate,
    time: series.time,
    duration: series.duration,
    maxCapacity: series.maxCapacity,
    description: series.description,
    isRecurring: false,
    excludedDates: [],
  };
  store.classes.push(newClass);

  // Copy recurring bookings to the new class as non-recurring
  const seriesBookings = store.bookings.filter(b => b.classId === seriesId && b.isRecurring);
  for (const booking of seriesBookings) {
    store.bookings.push({
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: booking.memberId,
      classId: newClass.id,
      isRecurring: false,
      bookedAt: new Date().toISOString(),
    });
  }

  // Add date to series' excludedDates
  if (!series.excludedDates.includes(occurrenceDate)) {
    series.excludedDates.push(occurrenceDate);
  }

  return newClass;
}

/**
 * Cancel a single occurrence of a recurring series.
 * Adds the date to excludedDates without deleting the series.
 * Returns the number of participants that would be notified.
 */
export async function cancelSingleOccurrence(
  seriesId: string,
  occurrenceDate: string,
): Promise<{ cancelled: boolean; notifiedCount: number }> {
  await delay();
  const series = store.classes.find(c => c.id === seriesId);
  if (!series) return { cancelled: false, notifiedCount: 0 };
  if (!series.isRecurring) return { cancelled: false, notifiedCount: 0 };

  // Add date to excludedDates
  if (!series.excludedDates.includes(occurrenceDate)) {
    series.excludedDates.push(occurrenceDate);
  }

  // Count recurring bookings (these are the participants to notify)
  const notifiedCount = store.bookings.filter(b => b.classId === seriesId && b.isRecurring).length;

  return { cancelled: true, notifiedCount };
}

export async function getAvailableSlots(
  date: string,
  room?: Room
): Promise<{ room: Room; time: string; duration: number }[]> {
  await delay();
  let classesOnDate = store.classes.filter(c => c.date === date);
  if (room) classesOnDate = classesOnDate.filter(c => c.room === room);
  return classesOnDate.map(c => ({ room: c.room, time: c.time, duration: c.duration }));
}

/**
 * Derive an instructor's active class types from their classes that have
 * future instances (non-recurring with date >= today, or recurring).
 */
export async function getInstructorClassTypes(instructorId: string): Promise<ClassType[]> {
  await delay();
  const today = formatDateStr(new Date());
  const types = new Set<ClassType>();
  for (const c of store.classes) {
    if (c.instructorId !== instructorId) continue;
    // Recurring classes always count (they have future instances)
    // Non-recurring classes count if their date is today or later
    if (c.isRecurring || c.date >= today) {
      types.add(c.classType);
    }
  }
  return [...types];
}
