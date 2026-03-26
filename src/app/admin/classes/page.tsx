'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import Select, { SelectOption } from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ClassListItem from '@/components/ui/ClassListItem';
import ClassDetailView from '@/components/ui/ClassDetailView';
import ClassFormModal, { type ClassForm, emptyClassForm } from '@/components/ui/ClassFormModal';
import { ClassTypeImage } from '@/lib/classTypeIcons';
import { CLASS_TYPE_LABELS, CLASS_TYPE_COLORS, ClassType, Room, Class, Instructor } from '@/types';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getClasses, updateClass, cancelClass, hasConflict, addClass, expandRecurringClasses, extractFromSeries, cancelSingleOccurrence } from '@/services/classes';
import { getInstructors } from '@/services/instructors';
import { getBookingCount, bookClass } from '@/services/bookings';
import { addMember } from '@/services/members';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import PhotoUpload from '@/components/ui/PhotoUpload';

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

const ALL_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [hStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (h === 0) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

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

export default function AdminClassesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Week pagination
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  // Filters
  const [search, setSearch] = useState('');
  const [filterClassType, setFilterClassType] = useState('');
  const [filterInstructorId, setFilterInstructorId] = useState('');
  const [showPast, setShowPast] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSingle, setEditingSingle] = useState(false);
  const [form, setForm] = useState<ClassForm>(emptyClassForm);
  const [saving, setSaving] = useState(false);

  // Cancel confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancellingClass, setCancellingClass] = useState<Class | null>(null);
  const [cancellingSingle, setCancellingSingle] = useState(false);

  // Detail view
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassObj, setSelectedClassObj] = useState<Class | null>(null);

  // Create member from class detail
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0);

  const isOwner = user?.role === 'owner';

  const selectedClass = selectedClassObj;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const filters: { instructorId?: string } = {};
    if (!isOwner && user) {
      filters.instructorId = user.id;
    }
    const [classData, instructorData] = await Promise.all([
      getClasses(filters),
      getInstructors(),
    ]);
    setClasses(classData);
    setInstructors(instructorData);

    const counts: Record<string, number> = {};
    await Promise.all(
      classData.map(async (c) => {
        counts[c.id] = await getBookingCount(c.id);
      })
    );
    setBookingCounts(counts);
    setLoading(false);
  }, [isOwner, user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const instructorMap = useMemo(() => {
    const map: Record<string, Instructor> = {};
    instructors.forEach((i) => { map[i.id] = i; });
    return map;
  }, [instructors]);

  // Week-filtered classes
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const weekFilteredClasses = useMemo(() => {
    const startStr = formatDateStr(weekStart);
    const endStr = formatDateStr(weekEnd);
    return expandRecurringClasses(classes, startStr, endStr);
  }, [classes, weekStart, weekEnd]);

  // Filter and sort classes
  const filteredClasses = useMemo(() => {
    let result = weekFilteredClasses;

    if (!showPast) {
      result = result.filter((c) => !isPast(c.date));
    }

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    if (filterClassType) {
      result = result.filter((c) => c.classType === filterClassType);
    }

    if (filterInstructorId) {
      result = result.filter((c) => c.instructorId === filterInstructorId);
    }

    return [...result].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time.localeCompare(b.time);
    });
  }, [weekFilteredClasses, search, filterClassType, filterInstructorId, showPast]);

  // Determine if "All Types" filter should be visible
  const uniqueClassTypes = useMemo(() => {
    const types = new Set(weekFilteredClasses.map((c) => c.classType));
    return types;
  }, [weekFilteredClasses]);

  const showClassTypeFilter = uniqueClassTypes.size > 1;

  // Select options
  const classTypeOptions: SelectOption[] = [
    { value: '', label: 'All Types' },
    ...ALL_CLASS_TYPES.map((ct) => ({
      value: ct,
      label: CLASS_TYPE_LABELS[ct],
      icon: <ClassTypeImage type={ct} size={20} />,
    })),
  ];

  const instructorFilterOptions: SelectOption[] = [
    { value: '', label: 'All Instructors' },
    ...instructors.map((i) => ({
      value: i.id,
      label: i.name,
      icon: <Avatar src={i.photo} name={i.name} size={20} />,
    })),
  ];

  // Week navigation
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

  // Create class modal
  const openCreateModal = () => {
    setEditingClass(null);
    setForm({ ...emptyClassForm, instructorId: !isOwner && user ? user.id : '' });
    setModalOpen(true);
  };

  // Edit modal
  const startEdit = (cls: Class, single = false) => {
    setEditingClass(cls);
    setEditingSingle(single);
    setForm({
      title: cls.title,
      classType: cls.classType,
      instructorId: cls.instructorId,
      room: cls.room,
      date: cls.date,
      time: cls.time,
      maxCapacity: cls.maxCapacity,
      duration: cls.duration,
      description: cls.description,
      isRecurring: single ? false : cls.isRecurring,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.classType || !form.instructorId || !form.date) return;
    setSaving(true);
    try {
      if (editingClass) {
        // Update existing class
        if (
          form.date !== editingClass.date ||
          form.time !== editingClass.time ||
          form.room !== editingClass.room
        ) {
          const conflict = await hasConflict(form.date, form.time, form.room as Room, editingClass.id);
          if (conflict) {
            showToast(`Schedule conflict: ${form.room} is already booked at ${formatTime(form.time)} on ${formatDisplayDate(form.date)}`, 'error');
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
        // Create new class
        await addClass({ ...form, classType: form.classType as ClassType, excludedDates: [] } as Omit<Class, 'id'>);
        showToast('Class created successfully');
      }
      setModalOpen(false);
      setEditingClass(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete from modal
  const handleDeleteFromModal = () => {
    if (!editingClass) return;
    setCancellingClass(editingClass);
    setConfirmOpen(true);
  };

  const handleCancel = async () => {
    if (!cancellingClass) return;
    if (cancellingSingle) {
      const result = await cancelSingleOccurrence(cancellingClass.id, cancellingClass.date);
      if (result.cancelled) {
        showToast(`Class on ${cancellingClass.date} cancelled. ${result.notifiedCount} participant${result.notifiedCount !== 1 ? 's' : ''} notified via SMS.`);
      }
      setSelectedClassId(null);
      setSelectedClassObj(null);
    } else {
      const result = await cancelClass(cancellingClass.id);
      if (result.cancelled) {
        showToast(`Class cancelled. SMS sent to ${result.cancelledBookings} member${result.cancelledBookings !== 1 ? 's' : ''}.`);
      }
      setModalOpen(false);
      setEditingClass(null);
    }
    setCancellingClass(null);
    setCancellingSingle(false);
    await fetchData();
  };

  // Create member from class detail
  const openCreateMemberFromClass = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const initialForm = { ...emptyMemberForm };
    if (cls) {
      initialForm.assignedClassIds = [classId];
      initialForm.favoriteClassTypes = [cls.classType];
      initialForm.favoriteInstructors = [cls.instructorId];
    }
    setMemberForm(initialForm);
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

    // Book assigned classes
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
    await fetchData();
  };

  const canEditSelected =
    selectedClass &&
    (user?.role === 'owner' || (user?.role === 'instructor' && user.id === selectedClass.instructorId));

  const closeModal = () => { setModalOpen(false); setEditingClass(null); setEditingSingle(false); };

  const classFormModal = (
    <ClassFormModal
      isOpen={modalOpen}
      onClose={closeModal}
      editingClass={editingClass}
      classes={classes}
      instructors={instructors}
      isOwner={isOwner}
      form={form}
      setForm={setForm}
      saving={saving}
      onSave={handleSave}
      onDelete={handleDeleteFromModal}
      editingSingle={editingSingle}
    />
  );

  if (selectedClassId && selectedClass) {
    return (
      <>
        <ClassDetailView
          cls={selectedClass}
          backLabel="Back to Classes"
          onBack={() => { setSelectedClassId(null); setSelectedClassObj(null); }}
          canEdit={!!canEditSelected}
          onEdit={() => startEdit(selectedClass)}
          onCancel={() => {
            setCancellingClass(selectedClass);
            setConfirmOpen(true);
          }}
          onEditSingle={async () => {
            const newClass = await extractFromSeries(selectedClass.id, selectedClass.date);
            await fetchData();
            setSelectedClassId(newClass.id);
            setSelectedClassObj(newClass);
            startEdit(newClass, true);
          }}
          onCancelSingle={() => {
            setCancellingClass(selectedClass);
            setCancellingSingle(true);
            setConfirmOpen(true);
          }}
          onCreateMember={openCreateMemberFromClass}
          onParticipantsChanged={fetchData}
          refreshKey={rosterRefreshKey}
        />

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setCancellingClass(null); setCancellingSingle(false); }}
          onConfirm={handleCancel}
          title={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
          message={cancellingSingle
            ? `Are you sure you want to cancel the ${cancellingClass?.date} occurrence of "${cancellingClass?.title}"? Participants will be notified via SMS.`
            : `Are you sure you want to cancel "${cancellingClass?.title}"? All booked members will be notified.`}
          confirmLabel={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
          confirmVariant="danger"
        />

        {classFormModal}

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
                {instructors.map((instructor) => (
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header: Title + Create | Week picker (centered on lg) */}
      <div className="flex flex-wrap items-center gap-3 mb-6 md:grid md:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Classes</h1>
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-text-secondary">
            {filteredClasses.length}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 order-3 md:order-none basis-full md:basis-auto">
          <button
            onClick={prevWeek}
            className="cursor-pointer inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Week</span>
          </button>
          <span className="text-sm font-medium text-text px-3">{formatWeekRange(weekStart)}</span>
          <button
            onClick={nextWeek}
            className="cursor-pointer inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <span className="hidden sm:inline">Next Week</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="ml-auto md:ml-0">
          <button
            onClick={openCreateModal}
            className="cursor-pointer inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Class
          </button>
        </div>
      </div>

      {/* Filters + Search + Show past */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 max-w-full">
          {showClassTypeFilter && (
            <Select
              value={filterClassType}
              onChange={setFilterClassType}
              options={classTypeOptions}
              placeholder="All Types"
              className="flex-1 min-w-0 sm:flex-none sm:min-w-40"
            />
          )}
          {isOwner && (
            <Select
              value={filterInstructorId}
              onChange={setFilterInstructorId}
              options={instructorFilterOptions}
              placeholder="All Instructors"
              className="flex-1 min-w-0 sm:flex-none sm:min-w-40"
            />
          )}
        </div>
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by class title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="text-sm text-text-secondary">Show past classes</span>
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className={`cursor-pointer relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              showPast ? 'bg-primary' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                showPast ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Classes list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">
            {search || filterClassType || filterInstructorId
              ? 'No classes match your filters.'
              : 'No classes this week.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredClasses.map((cls) => {
            const instructor = instructorMap[cls.instructorId];
            const count = bookingCounts[cls.id] ?? 0;

            return (
              <ClassListItem
                key={cls.id}
                cls={cls}
                instructor={instructor}
                bookingCount={count}
                onClick={() => { setSelectedClassId(cls.id); setSelectedClassObj(cls); }}
              />
            );
          })}
        </div>
      )}

      {classFormModal}

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setCancellingClass(null);
          setCancellingSingle(false);
        }}
        onConfirm={handleCancel}
        title={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
        message={cancellingSingle
          ? `Are you sure you want to cancel the ${cancellingClass?.date} occurrence of "${cancellingClass?.title}"? Participants will be notified via SMS.`
          : `Are you sure you want to cancel "${cancellingClass?.title}"? All booked members will be notified.`}
        confirmLabel={cancellingSingle ? 'Cancel This Class' : 'Cancel Class'}
        confirmVariant="danger"
      />
    </div>
  );
}
