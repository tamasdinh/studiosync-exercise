import { store } from './dataStore';
import { Booking, Class, Member } from '@/types';

const delay = () => new Promise(r => setTimeout(r, 100));
const generateId = () => `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function getBookings(filters?: {
  memberId?: string;
  classId?: string;
}): Promise<Booking[]> {
  await delay();
  let result = store.bookings;
  if (filters) {
    if (filters.memberId) result = result.filter(b => b.memberId === filters.memberId);
    if (filters.classId) result = result.filter(b => b.classId === filters.classId);
  }
  return result;
}

export async function bookClass(
  memberId: string,
  classId: string,
  isRecurring: boolean
): Promise<Booking> {
  await delay();

  const cls = store.classes.find(c => c.id === classId);
  if (!cls) throw new Error('Class not found');

  const member = store.members.find(m => m.id === memberId);
  if (!member) throw new Error('Member not found');

  const currentBookings = store.bookings.filter(b => b.classId === classId);
  if (currentBookings.length >= cls.maxCapacity) {
    throw new Error('Class is at full capacity');
  }

  const alreadyBooked = currentBookings.some(b => b.memberId === memberId);
  if (alreadyBooked) {
    throw new Error('Member is already booked for this class');
  }

  const booking: Booking = {
    id: generateId(),
    memberId,
    classId,
    isRecurring,
    bookedAt: new Date().toISOString(),
  };
  store.bookings.push(booking);
  return booking;
}

export async function cancelBooking(bookingId: string): Promise<boolean> {
  await delay();
  const index = store.bookings.findIndex(b => b.id === bookingId);
  if (index === -1) return false;
  store.bookings.splice(index, 1);
  return true;
}

export async function getClassRoster(
  classId: string
): Promise<(Member & { booking: Booking })[]> {
  await delay();
  const classBookings = store.bookings.filter(b => b.classId === classId);
  return classBookings
    .map(booking => {
      const member = store.members.find(m => m.id === booking.memberId);
      if (!member) return null;
      return { ...member, booking };
    })
    .filter((entry): entry is Member & { booking: Booking } => entry !== null);
}

export async function getMemberBookings(
  memberId: string
): Promise<(Booking & { class: Class })[]> {
  await delay();
  const memberBookings = store.bookings.filter(b => b.memberId === memberId);
  return memberBookings
    .map(booking => {
      const cls = store.classes.find(c => c.id === booking.classId);
      if (!cls) return null;
      return { ...booking, class: cls };
    })
    .filter((entry): entry is Booking & { class: Class } => entry !== null);
}

export async function getBookingCount(classId: string): Promise<number> {
  await delay();
  return store.bookings.filter(b => b.classId === classId).length;
}
