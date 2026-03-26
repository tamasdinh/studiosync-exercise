'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getInstructorById } from '@/services/instructors';
import { getClasses, expandRecurringClasses, getInstructorClassTypes } from '@/services/classes';
import { getBookings, bookClass, cancelBooking, getBookingCount } from '@/services/bookings';
import { Class, Instructor, Booking, ClassType, CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from '@/types';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ClassListItem from '@/components/ui/ClassListItem';
import Select, { SelectOption } from '@/components/ui/Select';

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

export default function InstructorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [activeClassTypes, setActiveClassTypes] = useState<ClassType[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedClassType, setSelectedClassType] = useState<ClassType | ''>('');
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);

    const [instructorData, classes, bookings, classTypes] = await Promise.all([
      getInstructorById(id),
      getClasses({ instructorId: id }),
      getBookings({ memberId: user.id }),
      getInstructorClassTypes(id),
    ]);

    setInstructor(instructorData);
    setActiveClassTypes(classTypes);
    setAllClasses(classes);
    setMyBookings(bookings);

    const counts: Record<string, number> = {};
    await Promise.all(
      classes.map(async (cls) => {
        counts[cls.id] = await getBookingCount(cls.id);
      })
    );
    setBookingCounts(counts);
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-text-light py-8 text-center">Instructor not found.</p>
      </div>
    );
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = formatDateStr(weekStart);
  const weekEndStr = formatDateStr(weekEnd);

  const myBookingMap = new Map(myBookings.map((b) => [b.classId, b]));

  const todayStr = formatDateStr(new Date());

  const expandedClasses = expandRecurringClasses(allClasses, weekStartStr, weekEndStr);
  const filteredClasses = expandedClasses
    .filter((cls) => {
      if (cls.date < todayStr) return false; // hide past classes
      if (selectedClassType !== '' && cls.classType !== selectedClassType) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

  const classesByDay = new Map<string, Class[]>();
  for (const cls of filteredClasses) {
    const existing = classesByDay.get(cls.date) || [];
    existing.push(cls);
    classesByDay.set(cls.date, existing);
  }

  const prevWeek = () => {
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
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to book class';
      showToast(message, 'error');
    }
  };

  const handleCancel = (bookingId: string) => {
    setConfirmCancel(bookingId);
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancel) return;
    await cancelBooking(confirmCancel);
    showToast('Booking cancelled');
    setConfirmCancel(null);
    await loadData();
  };

  const canBook = true; // all roles can book

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-8">
        <div className="flex items-start gap-6">
          <Avatar src={instructor.photo} name={instructor.name} size={112} className="rounded-2xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-text">{instructor.name}</h1>
            <p className="text-text-secondary mt-2">{instructor.bio}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {activeClassTypes.map((ct) => {
                const colors = CLASS_TYPE_COLORS[ct];
                return (
                  <span
                    key={ct}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    {CLASS_TYPE_LABELS[ct]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Classes Section */}
      <h2 className="text-xl font-bold text-text mb-4">Classes</h2>

      {/* Week Picker + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-text min-w-[200px] text-center">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={nextWeek}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-text-secondary"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 sm:ml-auto">
          <Select
            value={selectedClassType}
            onChange={(val) => setSelectedClassType(val as ClassType | '')}
            options={[
              { value: '', label: 'All Types' },
              ...ALL_CLASS_TYPES.map((ct) => ({ value: ct, label: CLASS_TYPE_LABELS[ct] })),
            ]}
          />
        </div>
      </div>

      {/* Class List */}
      {filteredClasses.length === 0 ? (
        <p className="text-sm text-text-light py-8 text-center">No classes found for this week.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(classesByDay.entries()).map(([dateStr, dayClasses]) => (
            <div key={dateStr}>
              <h3 className="text-lg font-semibold text-text mb-3">{formatDayHeader(dateStr)}</h3>
              <div className="space-y-3">
                {dayClasses.map((cls) => {
                  const booking = myBookingMap.get(cls.id);
                  const count = bookingCounts[cls.id] ?? 0;
                  const spotsLeft = cls.maxCapacity - count;
                  const isBooked = !!booking;

                  return (
                    <ClassListItem
                      key={cls.id}
                      cls={cls}
                      isBooked={isBooked}
                      spotsLeft={spotsLeft}
                      onBook={canBook ? () => handleBook(cls.id) : undefined}
                      onCancelBooking={booking ? () => handleCancel(booking.id) : undefined}
                      showDate={false}
                      showInstructor={false}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmCancel !== null}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking?"
        confirmLabel="Cancel Booking"
        confirmVariant="danger"
      />
    </div>
  );
}
