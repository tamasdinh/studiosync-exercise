'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ClassDetailView from '@/components/ui/ClassDetailView';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import PhotoUpload from '@/components/ui/PhotoUpload';
import Select, { type SelectOption } from '@/components/ui/Select';
import ClassFormModal, { type ClassForm, emptyClassForm } from '@/components/ui/ClassFormModal';
import {
  Class,
  ClassType,
  Room,
  Instructor,
  CLASS_TYPE_CALENDAR_COLORS,
  CLASS_TYPE_LABELS,
  CLASS_TYPE_COLORS,
} from '@/types';
import { getClasses, addClass, updateClass, cancelClass, hasConflict, expandRecurringClasses, extractFromSeries, cancelSingleOccurrence } from '@/services/classes';
import { getInstructors } from '@/services/instructors';
import { addMember } from '@/services/members';
import { bookClass } from '@/services/bookings';

const ALL_MEMBER_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  photo: string;
  favoriteClassTypes: ClassType[];
  favoriteInstructors: string[];
  assignedClassIds: string[];
};

const emptyMemberForm: MemberForm = {
  name: '',
  email: '',
  phone: '',
  photo: '',
  favoriteClassTypes: [],
  favoriteInstructors: [],
  assignedClassIds: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTime24To12(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayLabel(date: Date): { dayName: string; dateLabel: string } {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { dayName, dateLabel };
}

function formatFullDay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21 (7 AM to 9 PM)

const CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];
const ROOMS: Room[] = ['Room 1', 'Room 2'];

type RoomFilter = Room | 'Both';

// ---------------------------------------------------------------------------
// Main Calendar Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedRoom, setSelectedRoom] = useState<RoomFilter>('Both');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassObj, setSelectedClassObj] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Record<string, Instructor>>({});
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSingle, setEditingSingle] = useState(false);
  const [form, setForm] = useState<ClassForm>(emptyClassForm);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [cancellingSingle, setCancellingSingle] = useState(false);
  const [scrolledToTop, setScrolledToTop] = useState(true);

  // Create member from class detail
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0);
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = () => {
      const el = desktopScrollRef.current || mobileScrollRef.current;
      setScrolledToTop(!el || el.scrollTop < 4);
    };
    const dEl = desktopScrollRef.current;
    const mEl = mobileScrollRef.current;
    dEl?.addEventListener('scroll', handler, { passive: true });
    mEl?.addEventListener('scroll', handler, { passive: true });
    return () => {
      dEl?.removeEventListener('scroll', handler);
      mEl?.removeEventListener('scroll', handler);
    };
  });

  // Mobile: selected day index (0-6, Mon-Sun)
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1;
  });

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchClasses = useCallback(async () => {
    const all = await getClasses();
    const dates = getWeekDates(currentWeekStart);
    const startStr = formatDate(dates[0]);
    const endStr = formatDate(dates[dates.length - 1]);
    const filtered = expandRecurringClasses(all, startStr, endStr);
    setClasses(filtered);
  }, [currentWeekStart]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    getInstructors().then((list) => {
      setAllInstructors(list);
      const map: Record<string, Instructor> = {};
      list.forEach((inst) => {
        map[inst.id] = inst;
      });
      setInstructorsMap(map);
    });
  }, []);

  // Fetch detail data when a class is selected
  const selectedClass = selectedClassObj;

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToPrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setSelectedClassId(null); setSelectedClassObj(null);
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setSelectedClassId(null); setSelectedClassObj(null);
  };

  const goToPrevDay = () => {
    setMobileDayIndex((prev) => {
      if (prev === 0) {
        goToPrevWeek();
        return 6;
      }
      return prev - 1;
    });
    setSelectedClassId(null); setSelectedClassObj(null);
  };

  const goToNextDay = () => {
    setMobileDayIndex((prev) => {
      if (prev === 6) {
        goToNextWeek();
        return 0;
      }
      return prev + 1;
    });
    setSelectedClassId(null); setSelectedClassObj(null);
  };

  // ---------------------------------------------------------------------------
  // Filtered classes for grid
  // ---------------------------------------------------------------------------

  const filteredClasses = useMemo(() => {
    if (selectedRoom === 'Both') return classes;
    return classes.filter((c) => c.room === selectedRoom);
  }, [classes, selectedRoom]);

  const mobileDate = weekDates[mobileDayIndex];
  const mobileDateStr = formatDate(mobileDate);
  const mobileClasses = useMemo(
    () =>
      filteredClasses
        .filter((c) => c.date === mobileDateStr)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [filteredClasses, mobileDateStr],
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const isOwner = user?.role === 'owner';

  const handleClassClick = (cls: Class) => {
    setSelectedClassId(cls.id);
    setSelectedClassObj(cls);
  };

  const handleBackToCalendar = () => {
    setSelectedClassId(null); setSelectedClassObj(null);
  };

  const handleCancel = () => {
    if (!selectedClass) return;
    setConfirmCancel(selectedClass.id);
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancel) return;
    const cls = classes.find((c) => c.id === confirmCancel);
    if (!cls) return;
    if (cancellingSingle && selectedClass) {
      const result = await cancelSingleOccurrence(cls.id, selectedClass.date);
      if (result.cancelled) {
        showToast(`Class on ${selectedClass.date} cancelled. ${result.notifiedCount} participant${result.notifiedCount !== 1 ? 's' : ''} notified via SMS.`);
      }
      setSelectedClassId(null); setSelectedClassObj(null);
    } else {
      const result = await cancelClass(cls.id);
      if (result.cancelled) {
        showToast(`Class cancelled. SMS sent to ${result.cancelledBookings} members.`);
      }
      setSelectedClassId(null); setSelectedClassObj(null);
      setModalOpen(false);
      setEditingClass(null);
    }
    setConfirmCancel(null);
    setCancellingSingle(false);
    fetchClasses();
  };

  // Create member from class detail
  const openCreateMemberFromClass = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const initial = { ...emptyMemberForm };
    if (cls) {
      initial.assignedClassIds = [classId];
      initial.favoriteClassTypes = [cls.classType];
      initial.favoriteInstructors = [cls.instructorId];
    }
    setMemberForm(initial);
    setMemberModalOpen(true);
  };

  const toggleMemberClassType = (ct: ClassType) => {
    setMemberForm((prev) => ({
      ...prev,
      favoriteClassTypes: prev.favoriteClassTypes.includes(ct)
        ? prev.favoriteClassTypes.filter((t) => t !== ct)
        : [...prev.favoriteClassTypes, ct],
    }));
  };

  const toggleMemberInstructor = (id: string) => {
    setMemberForm((prev) => ({
      ...prev,
      favoriteInstructors: prev.favoriteInstructors.includes(id)
        ? prev.favoriteInstructors.filter((i) => i !== id)
        : [...prev.favoriteInstructors, id],
    }));
  };

  const addMemberClassAssignment = (classId: string) => {
    if (!memberForm.assignedClassIds.includes(classId)) {
      const cls = classes.find((c) => c.id === classId);
      setMemberForm((prev) => {
        const updated = { ...prev, assignedClassIds: [...prev.assignedClassIds, classId] };
        if (cls) {
          if (!updated.favoriteClassTypes.includes(cls.classType)) {
            updated.favoriteClassTypes = [...updated.favoriteClassTypes, cls.classType];
          }
          if (!updated.favoriteInstructors.includes(cls.instructorId)) {
            updated.favoriteInstructors = [...updated.favoriteInstructors, cls.instructorId];
          }
        }
        return updated;
      });
    }
  };

  const removeMemberClassAssignment = (classId: string) => {
    setMemberForm((prev) => ({
      ...prev,
      assignedClassIds: prev.assignedClassIds.filter((id) => id !== classId),
    }));
  };

  const upcomingClassesForMember = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return classes.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [classes]);

  const handleSaveMember = async () => {
    const photoUrl =
      memberForm.photo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(memberForm.name)}&background=cbd5e1&color=fff`;
    const { assignedClassIds, ...rest } = memberForm;
    const payload = { ...rest, photo: photoUrl };
    const newMember = await addMember(payload);
    for (const classId of assignedClassIds) {
      const cls = classes.find((c) => c.id === classId);
      try {
        await bookClass(newMember.id, classId, cls?.isRecurring ?? false);
      } catch {
        // skip if already booked or at capacity
      }
    }
    showToast('Member added to StudioSync — an email invitation has been sent');
    setMemberModalOpen(false);
    setRosterRefreshKey((k) => k + 1);
    fetchClasses();
  };

  // Modal: open create
  const openCreateModal = () => {
    setEditingClass(null);
    setForm({ ...emptyClassForm, instructorId: !isOwner && user ? user.id : '' });
    setModalOpen(true);
  };

  // Modal: open edit
  const handleEdit = (single = false) => {
    if (!selectedClass) return;
    setEditingClass(selectedClass);
    setEditingSingle(single);
    setForm({
      title: selectedClass.title,
      classType: selectedClass.classType,
      instructorId: selectedClass.instructorId,
      room: selectedClass.room,
      date: selectedClass.date,
      time: selectedClass.time,
      maxCapacity: selectedClass.maxCapacity,
      duration: selectedClass.duration,
      description: selectedClass.description,
      isRecurring: single ? false : selectedClass.isRecurring,
    });
    setModalOpen(true);
  };

  // Modal: save
  const handleSave = async () => {
    if (!form.title || !form.classType || !form.instructorId || !form.date) return;
    setSaving(true);
    try {
      if (editingClass) {
        if (
          form.date !== editingClass.date ||
          form.time !== editingClass.time ||
          form.room !== editingClass.room
        ) {
          const conflict = await hasConflict(form.date, form.time, form.room as Room, editingClass.id);
          if (conflict) {
            showToast(`Schedule conflict: ${form.room} is already booked at ${formatTime24To12(form.time)} on ${form.date}`, 'error');
            setSaving(false);
            return;
          }
        }
        const updated = await updateClass(editingClass.id, { ...form, classType: form.classType as ClassType });
        if (updated && selectedClassId === editingClass.id) {
          setSelectedClassObj(updated);
        }
        showToast('Class updated successfully');
      } else {
        await addClass({ ...form, classType: form.classType as ClassType, excludedDates: [] } as Omit<Class, 'id'>);
        showToast('Class created successfully');
      }
      setModalOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Modal: delete from modal
  const handleDeleteFromModal = () => {
    if (!editingClass) return;
    setConfirmCancel(editingClass.id);
  };

  const closeModal = () => { setModalOpen(false); setEditingClass(null); setEditingSingle(false); };

  const canEditSelected =
    user &&
    selectedClass &&
    (user.role === 'owner' || (user.role === 'instructor' && user.id === selectedClass.instructorId));

  // ---------------------------------------------------------------------------
  // Week label
  // ---------------------------------------------------------------------------

  const weekLabel = `${formatMonthDay(weekDates[0])} \u2013 ${formatMonthDay(weekDates[6])}, ${weekDates[6].getFullYear()}`;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const roomFilterButtons: { label: string; value: RoomFilter }[] = [
    { label: 'Room 1', value: 'Room 1' },
    { label: 'Room 2', value: 'Room 2' },
    { label: 'Both', value: 'Both' },
  ];

  function getInstructorFirstName(instructorId: string): string {
    const inst = instructorsMap[instructorId];
    if (!inst) return '';
    return inst.name.split(' ')[0];
  }

  // Map class to grid position
  function getHourIndex(time: string): number {
    const h = parseInt(time.split(':')[0], 10);
    return h - 7; // row index (0-based)
  }

  // ---------------------------------------------------------------------------
  // Class Form Modal (shared component)
  // ---------------------------------------------------------------------------

  const classFormModal = (
    <ClassFormModal
      isOpen={modalOpen}
      onClose={closeModal}
      editingClass={editingClass}
      classes={classes}
      instructors={allInstructors}
      isOwner={isOwner}
      form={form}
      setForm={setForm}
      saving={saving}
      onSave={handleSave}
      onDelete={handleDeleteFromModal}
      editingSingle={editingSingle}
    />
  );

  // ---------------------------------------------------------------------------
  // Desktop Calendar Grid
  // ---------------------------------------------------------------------------

  function renderDesktopGrid() {
    const isBoth = selectedRoom === 'Both';
    const dayColCount = isBoth ? 2 : 1;
    const totalCols = 7 * dayColCount;

    // Build a lookup: key = "dateStr|hour|room?" -> Class[]
    const classLookup: Record<string, Class[]> = {};
    filteredClasses.forEach((cls) => {
      const hourIdx = getHourIndex(cls.time);
      if (hourIdx < 0 || hourIdx >= HOURS.length) return;
      const dayIdx = weekDates.findIndex((d) => formatDate(d) === cls.date);
      if (dayIdx === -1) return;

      let colKey: string;
      if (isBoth) {
        const roomIdx = cls.room === 'Room 1' ? 0 : 1;
        colKey = `${dayIdx}-${roomIdx}`;
      } else {
        colKey = `${dayIdx}`;
      }
      const key = `${hourIdx}|${colKey}`;
      if (!classLookup[key]) classLookup[key] = [];
      classLookup[key].push(cls);
    });

    const headerRowCount = isBoth ? 2 : 1;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Fixed header row */}
        <div className="shrink-0 overflow-visible relative z-10">
          <div
            className="min-w-200"
            style={{
              display: 'grid',
              gridTemplateColumns: `64px repeat(${totalCols}, minmax(0, 1fr))`,
            }}
          >
            {/* Top-left corner — show 7 AM label only when there's no room sub-header below and scrolled to top */}
            <div className="relative border-r border-border">
              {!isBoth && scrolledToTop && (
                <span className="absolute right-2 bottom-0 translate-y-1/2 text-[11px] text-text-secondary leading-none">
                  {formatTime24To12(`${String(HOURS[0]).padStart(2, '0')}:00`)}
                </span>
              )}
            </div>

            {/* Day headers */}
            {weekDates.map((date, dayIdx) => {
              const { dayName, dateLabel } = formatDayLabel(date);
              const colStart = 2 + dayIdx * dayColCount;
              const colEnd = colStart + dayColCount;
              const isToday = formatDate(date) === formatDate(new Date());
              return (
                <div
                  key={dayIdx}
                  className={`text-center py-2 border-b border-r border-border text-xs font-medium ${
                    isToday ? 'bg-blue-50' : 'bg-slate-50'
                  }`}
                  style={{ gridColumn: `${colStart} / ${colEnd}` }}
                >
                  <div className={`font-semibold ${isToday ? 'text-primary' : 'text-text'}`}>
                    {dayName}
                  </div>
                  <div className={isToday ? 'text-primary' : 'text-text-secondary'}>{dateLabel}</div>
                </div>
              );
            })}
          </div>

          {/* Room sub-headers (only when Both) */}
          {isBoth && (
            <div
              className="min-w-200"
              style={{
                display: 'grid',
                gridTemplateColumns: `64px repeat(${totalCols}, minmax(0, 1fr))`,
              }}
            >
              <div className="relative border-r border-border">
                {scrolledToTop && (
                  <span className="absolute right-2 bottom-0 translate-y-1/2 text-[11px] text-text-secondary leading-none">
                    {formatTime24To12(`${String(HOURS[0]).padStart(2, '0')}:00`)}
                  </span>
                )}
              </div>
              {weekDates.map((_, dayIdx) => (
                <div key={`room-${dayIdx}`} className="contents">
                  <div className="text-center py-1 border-b border-r border-border bg-slate-50 text-[10px] font-medium text-text-secondary">
                    Room 1
                  </div>
                  <div className="text-center py-1 border-b border-r border-border bg-slate-50 text-[10px] font-medium text-text-secondary">
                    Room 2
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable timetable body */}
        <div ref={desktopScrollRef} className="min-h-0 overflow-y-auto overflow-x-auto relative hide-scrollbar">
          <div
            className="min-w-200"
            style={{
              display: 'grid',
              gridTemplateColumns: `64px repeat(${totalCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${HOURS.length}, 60px)`,
            }}
          >
            {HOURS.map((hour, hourIdx) => (
              <div key={`row-${hourIdx}`} className="contents">
                {/* Time label — aligned to top gridline */}
                <div
                  className="pr-2 text-right text-[11px] text-text-secondary border-r border-border relative"
                  style={{ gridRow: `${hourIdx + 1} / ${hourIdx + 2}`, gridColumn: '1 / 2' }}
                >
                  {hourIdx > 0 && (
                    <span className="absolute right-2 top-0 -translate-y-1/2 leading-none">
                      {formatTime24To12(`${String(hour).padStart(2, '0')}:00`)}
                    </span>
                  )}
                </div>

                {/* Cells */}
                {Array.from({ length: totalCols }, (_, colIdx) => {
                  let colKey: string;
                  if (isBoth) {
                    const dayIdx = Math.floor(colIdx / 2);
                    const roomIdx = colIdx % 2;
                    colKey = `${dayIdx}-${roomIdx}`;
                  } else {
                    colKey = `${colIdx}`;
                  }
                  const key = `${hourIdx}|${colKey}`;
                  const cellClasses = classLookup[key] || [];

                  return (
                    <div
                      key={colIdx}
                      className="border-b border-r border-border relative p-0.5 flex flex-col"
                      style={{
                        gridRow: `${hourIdx + 1} / ${hourIdx + 2}`,
                        gridColumn: `${2 + colIdx} / ${3 + colIdx}`,
                      }}
                    >
                      {cellClasses.map((cls) => {
                        const colors = CLASS_TYPE_CALENDAR_COLORS[cls.classType];
                        const isSelected = cls.id === selectedClassId;
                        return (
                          <button
                            key={cls.id}
                            onClick={() => handleClassClick(cls)}
                            className={`w-full h-full text-left rounded-md border-l-4 px-2 py-1 cursor-pointer text-xs leading-tight ${colors.bg} ${colors.border} ${colors.text} ${
                              isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                            } flex flex-col justify-center`}
                          >
                            <div className="font-semibold line-clamp-2 leading-tight">{cls.title}</div>
                            <div className="truncate">
                              {getInstructorFirstName(cls.instructorId)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Mobile single-day calendar grid
  // ---------------------------------------------------------------------------

  function renderMobileGrid() {
    const isBoth = true;
    const colCount = 2;

    // Build lookup for this day
    const mobileLookup: Record<string, Class[]> = {};
    mobileClasses.forEach((cls) => {
      const hourIdx = getHourIndex(cls.time);
      if (hourIdx < 0 || hourIdx >= HOURS.length) return;
      const colKey = isBoth ? (cls.room === 'Room 1' ? '0' : '1') : '0';
      const key = `${hourIdx}|${colKey}`;
      if (!mobileLookup[key]) mobileLookup[key] = [];
      mobileLookup[key].push(cls);
    });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Fixed header */}
        <div className="shrink-0">
          {isBoth ? (
            <div style={{ display: 'grid', gridTemplateColumns: `50px 1fr 1fr` }}>
              <div className="relative border-r border-border">
                {scrolledToTop && (
                  <span className="absolute right-1 bottom-0 translate-y-1/2 text-[10px] text-text-secondary leading-none">
                    {formatTime24To12(`${String(HOURS[0]).padStart(2, '0')}:00`)}
                  </span>
                )}
              </div>
              <div className="text-center py-1.5 border-b border-r border-border bg-slate-50 text-xs font-medium text-text-secondary">Room 1</div>
              <div className="text-center py-1.5 border-b border-border bg-slate-50 text-xs font-medium text-text-secondary">Room 2</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `50px 1fr` }}>
              <div className="relative border-r border-border">
                {scrolledToTop && (
                  <span className="absolute right-1 bottom-0 translate-y-1/2 text-[10px] text-text-secondary leading-none">
                    {formatTime24To12(`${String(HOURS[0]).padStart(2, '0')}:00`)}
                  </span>
                )}
              </div>
              <div className="text-center py-1.5 border-b border-border bg-slate-50 text-xs font-medium text-text-secondary">
                {String(selectedRoom)}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div ref={mobileScrollRef} className="min-h-0 overflow-y-auto relative hide-scrollbar">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `50px repeat(${colCount}, 1fr)`,
              gridTemplateRows: `repeat(${HOURS.length}, 56px)`,
            }}
          >
            {HOURS.map((hour, hourIdx) => (
              <div key={hourIdx} className="contents">
                <div
                  className="pr-1 text-right text-[10px] text-text-secondary border-r border-border relative"
                  style={{ gridRow: `${hourIdx + 1}`, gridColumn: '1' }}
                >
                  {hourIdx > 0 && (
                    <span className="absolute right-1 top-0 -translate-y-1/2 leading-none">
                      {formatTime24To12(`${String(hour).padStart(2, '0')}:00`)}
                    </span>
                  )}
                </div>
                {Array.from({ length: colCount }, (_, colIdx) => {
                  const key = `${hourIdx}|${colIdx}`;
                  const cellClasses = mobileLookup[key] || [];
                  return (
                    <div
                      key={colIdx}
                      className="border-b border-r border-border relative p-0.5"
                      style={{ gridRow: `${hourIdx + 1}`, gridColumn: `${colIdx + 2}` }}
                    >
                      {cellClasses.map((cls) => {
                        const colors = CLASS_TYPE_CALENDAR_COLORS[cls.classType];
                        const isSelected = cls.id === selectedClassId;
                        return (
                          <button
                            key={cls.id}
                            onClick={() => handleClassClick(cls)}
                            className={`w-full h-full text-left rounded-md border-l-3 px-1.5 py-0.5 cursor-pointer text-[11px] leading-tight ${colors.bg} ${colors.border} ${colors.text} ${
                              isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                            } flex flex-col justify-center`}
                          >
                            <div className="font-semibold line-clamp-2 leading-tight">{cls.title}</div>
                            <div className="truncate">
                              {getInstructorFirstName(cls.instructorId)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // If a class is selected, show the detail view instead of the calendar
  if (selectedClassId && selectedClass) {
    return (
      <>
        <ClassDetailView
          cls={selectedClass}
          backLabel="Back to Calendar"
          onBack={handleBackToCalendar}
          canEdit={!!canEditSelected}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onEditSingle={async () => {
            if (!selectedClass) return;
            const newClass = await extractFromSeries(selectedClass.id, selectedClass.date);
            await fetchClasses();
            setSelectedClassId(newClass.id);
            setSelectedClassObj(newClass);
            setEditingClass(newClass);
            setEditingSingle(true);
            setForm({
              title: newClass.title,
              classType: newClass.classType,
              instructorId: newClass.instructorId,
              room: newClass.room,
              date: newClass.date,
              time: newClass.time,
              maxCapacity: newClass.maxCapacity,
              duration: newClass.duration,
              description: newClass.description,
              isRecurring: false,
            });
            setModalOpen(true);
          }}
          onCancelSingle={() => {
            if (!selectedClass) return;
            setConfirmCancel(selectedClass.id);
            setCancellingSingle(true);
          }}
          onCreateMember={openCreateMemberFromClass}
          onParticipantsChanged={fetchClasses}
          refreshKey={rosterRefreshKey}
        />

        {classFormModal}

        <ConfirmDialog
          isOpen={confirmCancel !== null}
          onClose={() => { setConfirmCancel(null); setCancellingSingle(false); }}
          onConfirm={handleConfirmCancel}
          title={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
          message={cancellingSingle
            ? `Are you sure you want to cancel the ${selectedClass?.date} occurrence of "${selectedClass?.title ?? ''}"? Participants will be notified via SMS.`
            : `Are you sure you want to cancel "${selectedClass?.title ?? ''}"? This cannot be undone.`}
          confirmLabel={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
          confirmVariant="danger"
        />

        {/* Create Member from Class Detail */}
        <Modal isOpen={memberModalOpen} onClose={() => setMemberModalOpen(false)} title="Add Member" maxWidth="max-w-lg">
          <div className="flex items-center gap-4 mb-6">
            <PhotoUpload
              src={memberForm.photo}
              name={memberForm.name || 'New'}
              size={72}
              onChange={(url) => setMemberForm({ ...memberForm, photo: url })}
            />
            <div className="min-w-0">
              <p className="font-semibold text-text truncate">{memberForm.name || 'New Member'}</p>
              <p className="text-sm text-text-secondary truncate">{memberForm.email || 'No email yet'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Phone <span className="text-red-500">*</span></label>
              <input type="text" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>

            {/* Class Additions */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Class Additions</label>
              {memberForm.assignedClassIds.length > 0 && (
                <div className="mb-3 space-y-2">
                  {memberForm.assignedClassIds.map((classId) => {
                    const cls = classes.find((c) => c.id === classId);
                    if (!cls) return null;
                    return (
                      <div key={classId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-text">{cls.title}</span>
                          <span className="text-text-secondary ml-2">{cls.date} {cls.time}</span>
                        </div>
                        <button type="button" onClick={() => removeMemberClassAssignment(classId)} className="cursor-pointer p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0 ml-2">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Select
                value=""
                onChange={(val) => { if (val) addMemberClassAssignment(val); }}
                options={[
                  { value: '', label: 'Select a class to add...' },
                  ...upcomingClassesForMember
                    .filter((cls) => !memberForm.assignedClassIds.includes(cls.id))
                    .map((cls): SelectOption => ({
                      value: cls.id,
                      label: `${cls.title} — ${cls.date} ${cls.time}`,
                    })),
                ]}
                placeholder="Select a class to add..."
              />
            </div>

            {/* Favorite Class Types */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Favorite Class Types</label>
              <div className="flex flex-wrap gap-2">
                {ALL_MEMBER_CLASS_TYPES.map((ct) => (
                  <button key={ct} type="button" onClick={() => toggleMemberClassType(ct)} className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-colors ${memberForm.favoriteClassTypes.includes(ct) ? `${CLASS_TYPE_COLORS[ct].bg} ${CLASS_TYPE_COLORS[ct].text}` : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}>
                    {CLASS_TYPE_LABELS[ct]}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Instructors */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Favorite Instructors</label>
              <div className="flex flex-wrap gap-2">
                {allInstructors.map((instructor) => (
                  <button key={instructor.id} type="button" onClick={() => toggleMemberInstructor(instructor.id)} className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${memberForm.favoriteInstructors.includes(instructor.id) ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}>
                    <Avatar src={instructor.photo} name={instructor.name} size={16} />
                    {instructor.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setMemberModalOpen(false)} className="cursor-pointer bg-white text-text border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSaveMember} className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">Add Member</button>
            </div>
            <p className="text-xs text-text-secondary text-right mt-2">
              This will add the member to StudioSync and automatically send them an email invitation to join.
            </p>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* ---- Top Bar (Desktop) ---- */}
      <div className="hidden lg:flex items-center justify-between mb-6 gap-4">
        {/* Room filter */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          {roomFilterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => { setSelectedRoom(btn.value); setSelectedClassId(null); setSelectedClassObj(null); }}
              className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
                selectedRoom === btn.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-text hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Week picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="cursor-pointer inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Week</span>
          </button>
          <span className="text-sm font-medium text-text px-3">
            {weekLabel}
          </span>
          <button
            onClick={goToNextWeek}
            className="cursor-pointer inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <span className="hidden sm:inline">Next Week</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Class type legend */}
        <div className="flex items-center gap-3">
          {CLASS_TYPES.map((ct) => {
            const colors = CLASS_TYPE_CALENDAR_COLORS[ct];
            return (
              <div key={ct} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${colors.bg} border ${colors.border}`} />
                <span className="text-xs text-text-secondary">{CLASS_TYPE_LABELS[ct]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Top Bar (Mobile) ---- */}
      <div className="lg:hidden mb-4 space-y-2">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={goToPrevDay}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-text min-w-42.5 text-center">
            {formatFullDay(mobileDate)}
          </span>
          <button
            onClick={goToNextDay}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Class type legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {CLASS_TYPES.map((ct) => {
            const colors = CLASS_TYPE_CALENDAR_COLORS[ct];
            return (
              <div key={ct} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-3 h-3 rounded-sm shrink-0 ${colors.bg} border ${colors.border}`} />
                <span className="text-xs text-text-secondary">{CLASS_TYPE_LABELS[ct]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Desktop Grid with fixed headers and scrollable timetable ---- */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
        {renderDesktopGrid()}
      </div>

      {/* ---- Mobile single-day grid ---- */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">{renderMobileGrid()}</div>

      {/* ---- Create/Edit Modal ---- */}
      {classFormModal}

      <ConfirmDialog
        isOpen={confirmCancel !== null}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Class"
        message={`Are you sure you want to cancel "${selectedClass?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Cancel Class"
        confirmVariant="danger"
      />
    </div>
  );
}
