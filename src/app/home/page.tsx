'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getMemberById } from '@/services/members';
import { getClasses, expandRecurringClasses } from '@/services/classes';
import { getMemberBookings, cancelBooking, bookClass, getBookingCount } from '@/services/bookings';
import { getInstructors } from '@/services/instructors';
import { Member, Class, Instructor, Booking, CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from '@/types';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getClassTypeImageUrl } from '@/lib/classTypeIcons';
import Image from 'next/image';

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MemberHomePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [myBookings, setMyBookings] = useState<(Booking & { class: Class })[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [memberData, bookings, classes, instructorList] = await Promise.all([
      getMemberById(user.id),
      getMemberBookings(user.id),
      getClasses(),
      getInstructors(),
    ]);
    setMember(memberData);
    setMyBookings(bookings);
    setAllClasses(classes);
    setInstructors(instructorList);

    const counts: Record<string, number> = {};
    await Promise.all(
      classes.map(async (cls) => {
        counts[cls.id] = await getBookingCount(cls.id);
      })
    );
    setBookingCounts(counts);
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) return null;

  const today = new Date();
  const todayStr = formatDateStr(today);
  const weekEnd = getEndOfWeek(today);
  const weekEndStr = formatDateStr(weekEnd);

  // Upcoming classes this week (from today onwards)
  const upcomingBookings = myBookings
    .filter((b) => b.class.date >= todayStr && b.class.date <= weekEndStr)
    .sort((a, b) => {
      if (a.class.date !== b.class.date) return a.class.date.localeCompare(b.class.date);
      return a.class.time.localeCompare(b.class.time);
    });

  const instructorMap = new Map(instructors.map((i) => [i.id, i]));
  const bookedClassIds = new Set(myBookings.map((b) => b.classId));

  // Recommended classes: current + next week, matching favorites, not already booked
  const nextWeekEnd = new Date(weekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  const nextWeekEndStr = formatDateStr(nextWeekEnd);

  const expandedClasses = expandRecurringClasses(allClasses, todayStr, nextWeekEndStr);
  const recommendedClasses = member
    ? expandedClasses
        .filter((cls) => {
          if (cls.date < todayStr || cls.date > nextWeekEndStr) return false;
          if (bookedClassIds.has(cls.id)) return false;
          const matchesInstructor = member.favoriteInstructors.includes(cls.instructorId);
          const matchesClassType = member.favoriteClassTypes.includes(cls.classType);
          return matchesInstructor || matchesClassType;
        })
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        })
        .slice(0, 6)
    : [];

  const handleCancel = async (bookingId: string) => {
    await cancelBooking(bookingId);
    showToast('Booking cancelled');
    await fetchAll();
  };

  const handleBook = async (classId: string) => {
    if (!user) return;
    try {
      const cls = allClasses.find((c) => c.id === classId);
      await bookClass(user.id, classId, cls?.isRecurring ?? false);
      showToast('Class booked!');
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to book class';
      showToast(message, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      ) : (
        <>
          {/* Your Upcoming Classes */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-text mb-4">Your Upcoming Classes</h2>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-text-light">No upcoming classes this week.</p>
            ) : (
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {upcomingBookings.map((booking) => {
                  const cls = booking.class;
                  const instructor = instructorMap.get(cls.instructorId);
                  const colors = CLASS_TYPE_COLORS[cls.classType];
                  return (
                    <div
                      key={booking.id}
                      className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col"
                    >
                      {/* Image on top */}
                      <div className="relative h-44 w-full">
                        <Image
                          src={getClassTypeImageUrl(cls.classType)}
                          alt={CLASS_TYPE_LABELS[cls.classType]}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {CLASS_TYPE_LABELS[cls.classType]}
                          </span>
                          {booking.isRecurring && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/90 text-text-secondary" title="Recurring">
                              <ArrowPathIcon className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-text">{cls.title}</h3>
                            {instructor && (
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar src={instructor.photo} name={instructor.name} size={24} />
                                <Link
                                  href={`/instructor/${instructor.id}`}
                                  className="text-sm text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                  {instructor.name}
                                </Link>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary text-right shrink-0">
                            <p>{formatDisplayDate(cls.date)}</p>
                            <p>{formatTime(cls.time)}</p>
                            <p>{cls.room}</p>
                          </div>
                        </div>
                        {cls.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{cls.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-3">
                          <span className="text-xs text-text-secondary">Booked</span>
                          <button
                            onClick={() => setCancelTarget(booking.id)}
                            className="cursor-pointer bg-red-50 text-red-600 w-20 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors text-center"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recommended for You */}
          <section>
            <h2 className="text-lg font-semibold text-text mb-4">Recommended for You</h2>
            {recommendedClasses.length === 0 ? (
              <p className="text-sm text-text-light">No recommendations available right now.</p>
            ) : (
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {recommendedClasses.map((cls) => {
                  const instructor = instructorMap.get(cls.instructorId);
                  const colors = CLASS_TYPE_COLORS[cls.classType];
                  const count = bookingCounts[cls.id] ?? 0;
                  const spotsLeft = cls.maxCapacity - count;
                  return (
                    <div
                      key={cls.id}
                      className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col"
                    >
                      {/* Image on top */}
                      <div className="relative h-44 w-full">
                        <Image
                          src={getClassTypeImageUrl(cls.classType)}
                          alt={CLASS_TYPE_LABELS[cls.classType]}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {CLASS_TYPE_LABELS[cls.classType]}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-text">{cls.title}</h3>
                            {instructor && (
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar src={instructor.photo} name={instructor.name} size={24} />
                                <Link
                                  href={`/instructor/${instructor.id}`}
                                  className="text-sm text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                  {instructor.name}
                                </Link>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary text-right shrink-0">
                            <p>{formatDisplayDate(cls.date)}</p>
                            <p>{formatTime(cls.time)}</p>
                            <p>{cls.room}</p>
                          </div>
                        </div>
                        {cls.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{cls.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-3">
                          <span className="text-xs text-text-secondary">{spotsLeft} spots left</span>
                          <button
                            onClick={() => handleBook(cls.id)}
                            className="cursor-pointer bg-primary text-white w-20 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors text-center"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Cancel Booking Confirmation Dialog */}
          <ConfirmDialog
            isOpen={cancelTarget !== null}
            onClose={() => setCancelTarget(null)}
            onConfirm={() => {
              if (cancelTarget) handleCancel(cancelTarget);
            }}
            title="Cancel Booking"
            message="Are you sure you want to cancel this booking? This action cannot be undone."
            confirmLabel="Cancel Booking"
            confirmVariant="danger"
          />
        </>
      )}
    </div>
  );
}
