'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusIcon, PencilSquareIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Avatar from '@/components/ui/Avatar';
import PhotoUpload from '@/components/ui/PhotoUpload';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Select, { SelectOption } from '@/components/ui/Select';
import { Member, Instructor, Booking, Class, ClassType, CLASS_TYPE_LABELS, CLASS_TYPE_COLORS } from '@/types';
import { getMembers, addMember, updateMember, removeMember } from '@/services/members';
import { getInstructors } from '@/services/instructors';
import { getBookings } from '@/services/bookings';
import { getClasses } from '@/services/classes';
import { useToast } from '@/contexts/ToastContext';

const ALL_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  photo: string;
  favoriteClassTypes: ClassType[];
  favoriteInstructors: string[];
  assignedClassIds: string[];
};

const emptyForm: MemberForm = {
  name: '',
  email: '',
  phone: '',
  photo: '',
  favoriteClassTypes: [],
  favoriteInstructors: [],
  assignedClassIds: [],
};

export default function ManageMembersPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [membersData, instructorsData, bookingsData, classesData] = await Promise.all([
      getMembers(),
      getInstructors(),
      getBookings(),
      getClasses(),
    ]);
    setMembers(membersData);
    setInstructors(instructorsData);
    setBookings(bookingsData);
    setClasses(classesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q)
        )
      : members;
    return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [members, search]);

  const upcomingClasses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return classes.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [classes]);

  const getBookingCount = (memberId: string) => {
    return bookings.filter((b) => b.memberId === memberId).length;
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    const memberBookings = bookings.filter((b) => b.memberId === member.id);
    const assignedClassIds = memberBookings.map((b) => b.classId);
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      photo: member.photo,
      favoriteClassTypes: [...member.favoriteClassTypes],
      favoriteInstructors: [...member.favoriteInstructors],
      assignedClassIds,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const photoUrl =
      form.photo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=cbd5e1&color=fff`;
    const { assignedClassIds, ...rest } = form;
    const payload = { ...rest, photo: photoUrl };

    if (editingId) {
      await updateMember(editingId, payload);
      showToast('Member updated successfully');
    } else {
      await addMember(payload);
      showToast('Member added to StudioSync — an email invitation has been sent');
    }

    setModalOpen(false);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await removeMember(deletingId);
    showToast('Member removed successfully');
    setDeletingId(null);
    setModalOpen(false);
    await fetchData();
  };

  const toggleClassType = (ct: ClassType) => {
    setForm((prev) => ({
      ...prev,
      favoriteClassTypes: prev.favoriteClassTypes.includes(ct)
        ? prev.favoriteClassTypes.filter((t) => t !== ct)
        : [...prev.favoriteClassTypes, ct],
    }));
  };

  const toggleInstructor = (id: string) => {
    setForm((prev) => ({
      ...prev,
      favoriteInstructors: prev.favoriteInstructors.includes(id)
        ? prev.favoriteInstructors.filter((i) => i !== id)
        : [...prev.favoriteInstructors, id],
    }));
  };

  const addClassAssignment = (classId: string) => {
    if (!form.assignedClassIds.includes(classId)) {
      const cls = classes.find((c) => c.id === classId);
      setForm((prev) => {
        const updated = { ...prev, assignedClassIds: [...prev.assignedClassIds, classId] };
        // Auto-populate favorites from class assignment
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

  const removeClassAssignment = (classId: string) => {
    setForm((prev) => ({
      ...prev,
      assignedClassIds: prev.assignedClassIds.filter((id) => id !== classId),
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Members</h1>
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-text-secondary">
            {members.length}
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">
            {search ? 'No members match your search.' : 'No members yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-border px-4 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <Avatar src={member.photo} name={member.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text truncate">{member.name}</span>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-text-secondary whitespace-nowrap shrink-0">
                      {getBookingCount(member.id)} booking{getBookingCount(member.id) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary truncate">
                    <a href={`mailto:${member.email}`} className="hover:text-primary cursor-pointer transition-colors">{member.email}</a>
                  </div>
                  <div className="text-sm text-text-secondary">
                    <a href={`tel:${member.phone}`} className="hover:text-primary cursor-pointer transition-colors">{member.phone}</a>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(member)}
                  className="cursor-pointer p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors self-start"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {member.favoriteClassTypes.map((ct) => (
                  <span
                    key={ct}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${CLASS_TYPE_COLORS[ct].bg} ${CLASS_TYPE_COLORS[ct].text}`}
                  >
                    {CLASS_TYPE_LABELS[ct]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Member' : 'Add Member'} maxWidth="max-w-lg">
        {/* Header with photo + name/email */}
        <div className="flex items-center gap-4 mb-6">
          <PhotoUpload
            src={form.photo}
            name={form.name || 'New'}
            size={72}
            onChange={(url) => setForm({ ...form, photo: url })}
          />
          <div className="min-w-0">
            <p className="font-semibold text-text truncate">{form.name || 'New Member'}</p>
            <p className="text-sm text-text-secondary truncate">{form.email || 'No email yet'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Class Additions — only when creating */}
          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Class Additions
              </label>
              {upcomingClasses.length === 0 ? (
                <p className="text-xs text-text-light">No upcoming classes available.</p>
              ) : (
                <>
                  {form.assignedClassIds.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {form.assignedClassIds.map((classId) => {
                        const cls = classes.find((c) => c.id === classId);
                        if (!cls) return null;
                        return (
                          <div
                            key={classId}
                            className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-text">{cls.title}</span>
                              <span className="text-text-secondary ml-2">{cls.date} {cls.time}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeClassAssignment(classId)}
                              className="cursor-pointer p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0 ml-2"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Select
                    value=""
                    onChange={(val) => { if (val) addClassAssignment(val); }}
                    options={[
                      { value: '', label: 'Select a class to add...' },
                      ...upcomingClasses
                        .filter((cls) => !form.assignedClassIds.includes(cls.id))
                        .map((cls): SelectOption => ({
                          value: cls.id,
                          label: `${cls.title} — ${cls.date} ${cls.time}`,
                        })),
                    ]}
                    placeholder="Select a class to add..."
                  />
                </>
              )}
            </div>
          )}

          {/* Favorite Class Types */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Favorite Class Types
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_CLASS_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => toggleClassType(ct)}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.favoriteClassTypes.includes(ct)
                      ? `${CLASS_TYPE_COLORS[ct].bg} ${CLASS_TYPE_COLORS[ct].text}`
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {CLASS_TYPE_LABELS[ct]}
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Instructors */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Favorite Instructors
            </label>
            <div className="flex flex-wrap gap-2">
              {instructors.map((instructor) => (
                <button
                  key={instructor.id}
                  type="button"
                  onClick={() => toggleInstructor(instructor.id)}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                    form.favoriteInstructors.includes(instructor.id)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  <Avatar src={instructor.photo} name={instructor.name} size={16} />
                  {instructor.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setDeletingId(editingId);
                  setConfirmOpen(true);
                }}
                className="text-red-500 hover:text-red-700 text-sm font-medium cursor-pointer"
              >
                Deactivate
              </button>
            )}
            <div className="flex-1" />
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="cursor-pointer bg-white text-text border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                {editingId ? 'Save' : 'Add Member'}
              </button>
            </div>
          </div>
          {!editingId && (
            <p className="text-xs text-text-secondary text-right mt-2">
              This will add the member to StudioSync and automatically send them an email invitation to join.
            </p>
          )}
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title="Deactivate Member"
        message="Are you sure you want to deactivate this member? This will also cancel all their bookings. This action cannot be undone."
        confirmLabel="Deactivate"
        confirmVariant="danger"
      />
    </div>
  );
}
