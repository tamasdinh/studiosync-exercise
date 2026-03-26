'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusIcon, PencilSquareIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Avatar from '@/components/ui/Avatar';
import PhotoUpload from '@/components/ui/PhotoUpload';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Instructor, ClassType, CLASS_TYPE_LABELS, CLASS_TYPE_COLORS } from '@/types';
import { getInstructors, addInstructor, updateInstructor, removeInstructor } from '@/services/instructors';
import { getClasses, getInstructorClassTypes } from '@/services/classes';
import { useToast } from '@/contexts/ToastContext';

type InstructorForm = {
  name: string;
  email: string;
  phone: string;
  photo: string;
  bio: string;
};

const emptyForm: InstructorForm = {
  name: '',
  email: '',
  phone: '',
  photo: '',
  bio: '',
};

export default function ManageInstructorsPage() {
  const { showToast } = useToast();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [instructorClassTypes, setInstructorClassTypes] = useState<Record<string, ClassType[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<InstructorForm>(emptyForm);
  const [search, setSearch] = useState('');

  const fetchInstructors = async () => {
    setLoading(true);
    const [data, classes] = await Promise.all([getInstructors(), getClasses()]);
    setInstructors(data);
    const counts: Record<string, number> = {};
    for (const c of classes) {
      counts[c.instructorId] = (counts[c.instructorId] || 0) + 1;
    }
    setClassCounts(counts);
    const typeMap: Record<string, ClassType[]> = {};
    await Promise.all(data.map(async (i) => {
      typeMap[i.id] = await getInstructorClassTypes(i.id);
    }));
    setInstructorClassTypes(typeMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  const filteredInstructors = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? instructors.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.email.toLowerCase().includes(q)
        )
      : instructors;
    return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [instructors, search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (instructor: Instructor) => {
    setEditingId(instructor.id);
    setForm({
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      photo: instructor.photo,
      bio: instructor.bio,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.photo) return;
    const payload = { ...form, classTypes: [] as ClassType[] };

    if (editingId) {
      await updateInstructor(editingId, payload);
      showToast('Instructor updated successfully');
    } else {
      await addInstructor(payload);
      showToast('Instructor added successfully');
    }

    setModalOpen(false);
    await fetchInstructors();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await removeInstructor(deletingId);
    showToast('Instructor removed successfully');
    setDeletingId(null);
    setModalOpen(false);
    await fetchInstructors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Instructors</h1>
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-text-secondary">
            {instructors.length}
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Instructor
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
      ) : filteredInstructors.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">
            {search ? 'No instructors match your search.' : 'No instructors yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInstructors.map((instructor) => (
            <div
              key={instructor.id}
              className="bg-white rounded-lg border border-border px-4 py-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <Avatar src={instructor.photo} name={instructor.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text truncate">{instructor.name}</span>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-text-secondary whitespace-nowrap shrink-0">
                      {classCounts[instructor.id] || 0} class{(classCounts[instructor.id] || 0) !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary truncate">
                    <a href={`mailto:${instructor.email}`} className="hover:text-primary cursor-pointer transition-colors">{instructor.email}</a>
                  </div>
                  <div className="text-sm text-text-secondary">
                    <a href={`tel:${instructor.phone}`} className="hover:text-primary cursor-pointer transition-colors">{instructor.phone}</a>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(instructor)}
                  className="cursor-pointer p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors self-start"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {(instructorClassTypes[instructor.id] || []).map((ct) => (
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Instructor' : 'Add Instructor'}>
        {/* Header with photo + name/email */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center gap-1">
            <PhotoUpload
              src={form.photo}
              name={form.name || 'New'}
              size={72}
              onChange={(url) => setForm({ ...form, photo: url })}
            />
            {!form.photo && (
              <span className="text-xs text-red-500">Photo required</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text truncate">{form.name || 'New Instructor'}</p>
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

          <div>
            <label className="block text-sm font-medium text-text mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

        </div>

        <div className="flex items-center mt-6">
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
              disabled={!form.photo}
              className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
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
        title="Deactivate Instructor"
        message="Are you sure you want to deactivate this instructor? This action cannot be undone."
        confirmLabel="Deactivate"
        confirmVariant="danger"
      />
    </div>
  );
}
