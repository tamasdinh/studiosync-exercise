import { Booking } from '@/types';
import { classes } from './classes';

/**
 * Generate bookings spread across members and classes.
 * Some classes get many bookings (near or at capacity), most get a few.
 */
function generateBookings(): Booking[] {
  const memberIds = Array.from({ length: 12 }, (_, i) => `mem-${i + 1}`);
  const bookings: Booking[] = [];
  let bookingId = 1;

  // Track bookings per class to respect capacity, and per member-class to avoid duplicates
  const bookingsPerClass = new Map<string, number>();
  const memberClassPairs = new Set<string>();

  // Pick 2 classes to be at or near full capacity
  const popularClassIndices = [
    Math.floor(classes.length * 0.2),
    Math.floor(classes.length * 0.6),
  ];

  // Fill popular classes first
  for (const idx of popularClassIndices) {
    const cls = classes[idx];
    if (!cls) continue;
    // Book to full capacity (or capacity - 1 for "near")
    const target = idx === popularClassIndices[0] ? cls.maxCapacity : cls.maxCapacity - 1;
    const shuffledMembers = [...memberIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(target, shuffledMembers.length); i++) {
      const memberId = shuffledMembers[i];
      const pairKey = `${memberId}|${cls.id}`;
      if (memberClassPairs.has(pairKey)) continue;

      memberClassPairs.add(pairKey);
      bookingsPerClass.set(cls.id, (bookingsPerClass.get(cls.id) ?? 0) + 1);

      const bookedAt = new Date();
      bookedAt.setDate(bookedAt.getDate() - Math.floor(Math.random() * 7));
      bookedAt.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));

      bookings.push({
        id: `book-${bookingId}`,
        memberId,
        classId: cls.id,
        isRecurring: cls.isRecurring,
        bookedAt: bookedAt.toISOString(),
      });
      bookingId++;
    }
  }

  // Spread remaining bookings across other classes
  const remainingTarget = 25 - bookings.length;
  let added = 0;
  let safetyCounter = 0;

  while (added < remainingTarget && safetyCounter < 200) {
    safetyCounter++;
    const cls = classes[Math.floor(Math.random() * classes.length)];
    const memberId = memberIds[Math.floor(Math.random() * memberIds.length)];
    const pairKey = `${memberId}|${cls.id}`;

    if (memberClassPairs.has(pairKey)) continue;

    const currentCount = bookingsPerClass.get(cls.id) ?? 0;
    if (currentCount >= cls.maxCapacity) continue;

    memberClassPairs.add(pairKey);
    bookingsPerClass.set(cls.id, currentCount + 1);

    const bookedAt = new Date();
    bookedAt.setDate(bookedAt.getDate() - Math.floor(Math.random() * 7));
    bookedAt.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));

    bookings.push({
      id: `book-${bookingId}`,
      memberId,
      classId: cls.id,
      isRecurring: cls.isRecurring,
      bookedAt: bookedAt.toISOString(),
    });
    bookingId++;
    added++;
  }

  return bookings;
}

export const bookings: Booking[] = generateBookings();
