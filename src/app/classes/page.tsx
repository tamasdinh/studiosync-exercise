'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getClasses, expandRecurringClasses } from '@/services/classes';
import { getBookings, bookClass, cancelBooking, getBookingCount } from '@/services/bookings';
import { getInstructors } from '@/services/instructors';
import { getMemberById } from '@/services/members';
import Avatar from '@/components/ui/Avatar';
import Select, { SelectOption } from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ClassListItem from '@/components/ui/ClassListItem';
import { ClassTypeImage } from '@/lib/classTypeIcons';
import { Class, Instructor, Member, Booking, ClassType, CLASS_TYPE_LABELS } from '@/types';

const ALL_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = monday.toLocaleDateString('en-US', opts);
  const endStr = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} \u2013 ${endStr}`;
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ExploreClassesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [filterClassType, setFilterClassType] = useState<string>('');
  const [filterInstructor, setFilterInstructor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [classes, bookings, instructorList, memberData] = await Promise.all([
      getClasses(),
      getBookings({ memberId: user.id }),
      getInstructors(),
      getMemberById(user.id),
    ]);
    setAllClasses(classes);
    setMyBookings(bookings);
    setInstructors(instructorList);
    setMember(memberData);

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

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = formatDateStr(weekStart);
  const weekEndStr = formatDateStr(weekEnd);

  const instructorMap = new Map(instructors.map((i) => [i.id, i]));
  const myBookingMap = new Map(myBookings.map((b) => [b.classId, b]));
  const favoriteSet = new Set(member?.favoriteInstructors ?? []);

  const todayStr = formatDateStr(new Date());

  // Expand recurring classes for this week, then filter
  const expandedClasses = expandRecurringClasses(allClasses, weekStartStr, weekEndStr);
  const filteredClasses = expandedClasses
    .filter((cls) => {
      if (cls.date < todayStr) return false; // hide past classes
      if (filterClassType !== '' && cls.classType !== filterClassType) return false;
      if (filterInstructor !== '' && cls.instructorId !== filterInstructor) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

  // Group by day
  const classesByDay = new Map<string, Class[]>();
  for (const cls of filteredClasses) {
    const existing = classesByDay.get(cls.date) || [];
    existing.push(cls);
    classesByDay.set(cls.date, existing);
  }

  const currentMonday = getMonday(new Date());
  const isCurrentWeek = weekStart.getTime() <= currentMonday.getTime();

  const prevWeek = () => {
    if (isCurrentWeek) return;
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const handleBook = async (classId: string) => {
    if (!user) return;
    try {
      const cls = allClasses.find((c) => c.id === classId);
      await bookClass(user.id, classId, cls?.isRecurring ?? false);
      showToast('Class booked!');
      await fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to book class';
      showToast(message, 'error');
    }
  };

  const handleCancel = async (bookingId: string) => {
    await cancelBooking(bookingId);
    showToast('Booking cancelled');
    await fetchAll();
  };

  // Build select options
  const classTypeOptions: SelectOption[] = [
    { value: '', label: 'All Types' },
    ...ALL_CLASS_TYPES.map((ct) => ({
      value: ct,
      label: CLASS_TYPE_LABELS[ct],
      icon: <ClassTypeImage type={ct} size={20} />,
    })),
  ];

  const instructorOptions: SelectOption[] = [
    { value: '', label: 'All Instructors' },
    ...instructors.map((i) => ({
      value: i.id,
      label: i.name,
      icon: <Avatar src={i.photo} name={i.name} size={20} />,
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Explore Classes</h1>

      {/* Week Picker + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Week Picker — centered on small screens */}
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <button
            onClick={prevWeek}
            disabled={isCurrentWeek}
            className={`inline-flex items-center gap-1 text-sm transition-colors ${isCurrentWeek ? 'text-slate-300 cursor-not-allowed' : 'cursor-pointer text-text-secondary hover:text-text'}`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Week</span>
          </button>
          <span className="text-sm font-medium text-text px-3 whitespace-nowrap">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={nextWeek}
            className="cursor-pointer inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <span className="hidden sm:inline">Next Week</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 sm:ml-auto max-w-full">
          <Select
            value={filterClassType}
            onChange={(value) => setFilterClassType(value)}
            options={classTypeOptions}
            className="flex-1 min-w-0 sm:flex-none sm:min-w-40"
          />
          <Select
            value={filterInstructor}
            onChange={(value) => setFilterInstructor(value)}
            options={instructorOptions}
            className="flex-1 min-w-0 sm:flex-none sm:min-w-45"
          />
        </div>
      </div>

      {/* Class List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <p className="text-sm text-text-light py-8 text-center">No classes found for this week.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(classesByDay.entries()).map(([dateStr, dayClasses]) => (
            <div key={dateStr}>
              <h2 className="text-base font-semibold text-text mb-3">{formatDayHeader(dateStr)}</h2>
              <div className="space-y-3">
                {dayClasses.map((cls) => {
                  const instructor = instructorMap.get(cls.instructorId);
                  const booking = myBookingMap.get(cls.id);
                  const count = bookingCounts[cls.id] ?? 0;
                  const spotsLeft = cls.maxCapacity - count;
                  const isBooked = !!booking;
                  const isFavorite = instructor ? favoriteSet.has(instructor.id) : false;

                  return (
                    <ClassListItem
                      key={cls.id}
                      cls={cls}
                      instructor={instructor}
                      isBooked={isBooked}
                      isFavoriteInstructor={isFavorite}
                      spotsLeft={spotsLeft}
                      onBook={() => handleBook(cls.id)}
                      onCancelBooking={booking ? () => setCancelTarget(booking.id) : undefined}
                      showDate={false}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            handleCancel(cancelTarget);
            setCancelTarget(null);
          }
        }}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking?"
        confirmLabel="Cancel Booking"
        confirmVariant="danger"
      />
    </div>
  );
}
