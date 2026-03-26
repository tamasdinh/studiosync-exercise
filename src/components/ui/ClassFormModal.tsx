'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Select, { SelectOption } from '@/components/ui/Select';
import { ClassTypeImage } from '@/lib/classTypeIcons';
import { CLASS_TYPE_LABELS, ClassType, Room, Class, Instructor } from '@/types';

const ALL_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  const value = `${String(h).padStart(2, '0')}:00`;
  const label = h <= 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
  return { value, label: h === 12 ? '12:00 PM' : label };
});

export type ClassForm = {
  title: string;
  classType: ClassType | '';
  instructorId: string;
  room: Room;
  date: string;
  time: string;
  maxCapacity: number;
  duration: number;
  description: string;
  isRecurring: boolean;
};

export const emptyClassForm: ClassForm = {
  title: '',
  classType: '',
  instructorId: '',
  room: 'Room 1',
  date: '',
  time: '09:00',
  maxCapacity: 20,
  duration: 60,
  description: '',
  isRecurring: false,
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingClass: Class | null;
  /** All classes (used to compute occupied time slots) */
  classes: Class[];
  instructors: Instructor[];
  isOwner: boolean;
  form: ClassForm;
  setForm: (form: ClassForm) => void;
  saving: boolean;
  onSave: () => void;
  onDelete?: () => void;
  editingSingle?: boolean;
};

export default function ClassFormModal({
  isOpen,
  onClose,
  editingClass,
  classes,
  instructors,
  isOwner,
  form,
  setForm,
  saving,
  onSave,
  onDelete,
  editingSingle = false,
}: Props) {
  // Compute occupied time slots for the selected date, per room
  // Accounts for both non-recurring classes on that date and recurring classes on the same weekday
  const occupiedSlots = useMemo(() => {
    if (!form.date) return { 'Room 1': new Set<string>(), 'Room 2': new Set<string>() };
    const room1 = new Set<string>();
    const room2 = new Set<string>();
    const targetDow = new Date(form.date + 'T00:00:00').getDay();
    for (const c of classes) {
      if (editingClass && c.id === editingClass.id) continue;
      let occupiesDate = false;
      if (c.isRecurring) {
        const baseDow = new Date(c.date + 'T00:00:00').getDay();
        occupiesDate = baseDow === targetDow && !c.excludedDates.includes(form.date);
      } else {
        occupiesDate = c.date === form.date;
      }
      if (!occupiesDate) continue;
      if (c.room === 'Room 1') room1.add(c.time);
      if (c.room === 'Room 2') room2.add(c.time);
    }
    return { 'Room 1': room1, 'Room 2': room2 };
  }, [form.date, classes, editingClass]);

  // Time options: only filter out slots occupied in BOTH rooms (user can still pick a room)
  const availableTimeOptions = useMemo(() => {
    if (!form.date) return TIME_OPTIONS;
    // Show a time if at least one room is free at that time
    return TIME_OPTIONS.filter((opt) =>
      !occupiedSlots['Room 1'].has(opt.value) || !occupiedSlots['Room 2'].has(opt.value)
    );
  }, [form.date, occupiedSlots]);

  // Room options for the selected time
  const roomOptions = useMemo((): SelectOption[] => {
    const rooms: SelectOption[] = [];
    const room1Full = form.date && form.time && occupiedSlots['Room 1'].has(form.time);
    const room2Full = form.date && form.time && occupiedSlots['Room 2'].has(form.time);
    if (!room1Full) rooms.push({ value: 'Room 1', label: 'Room 1' });
    if (!room2Full) rooms.push({ value: 'Room 2', label: 'Room 2' });
    if (rooms.length === 0) {
      rooms.push({ value: 'Room 1', label: 'Room 1 (full)' });
      rooms.push({ value: 'Room 2', label: 'Room 2 (full)' });
    }
    return rooms;
  }, [form.date, form.time, occupiedSlots]);

  // Auto-select first available room when time changes
  const formRef = { date: form.date, time: form.time, room: form.room };
  useEffect(() => {
    if (!formRef.date || !formRef.time) return;
    const room1Taken = occupiedSlots['Room 1'].has(formRef.time);
    const room2Taken = occupiedSlots['Room 2'].has(formRef.time);
    let newRoom: Room | null = null;
    if (formRef.room === 'Room 1' && room1Taken && !room2Taken) {
      newRoom = 'Room 2';
    } else if (formRef.room === 'Room 2' && room2Taken && !room1Taken) {
      newRoom = 'Room 1';
    } else if (!room1Taken && formRef.room !== 'Room 1' && room2Taken) {
      newRoom = 'Room 1';
    }
    if (newRoom) {
      setForm({ ...form, room: newRoom });
    }
  }, [formRef.time, formRef.date, formRef.room, occupiedSlots]);

  const dateSelected = !!form.date;
  const timeSelected = !!form.time;
  const isFormValid = form.title && form.classType && form.instructorId && form.date;

  const instructorFormOptions: SelectOption[] = instructors.map((i) => ({
    value: i.id,
    label: i.name,
    icon: <Avatar src={i.photo} name={i.name} size={20} />,
  }));

  const classTypeFormOptions: SelectOption[] = ALL_CLASS_TYPES.map((ct) => ({
    value: ct,
    label: CLASS_TYPE_LABELS[ct],
    icon: <ClassTypeImage type={ct} size={20} />,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClass ? 'Edit Class' : 'Create Class'}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Class Type */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Class Type <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.classType}
            onChange={(v) => setForm({ ...form, classType: v as ClassType })}
            options={classTypeFormOptions}
            placeholder="Select type"
          />
        </div>

        {/* Instructor */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Instructor <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.instructorId}
            onChange={(v) => setForm({ ...form, instructorId: v })}
            options={instructorFormOptions}
            placeholder="Select instructor"
            className={!isOwner ? 'opacity-60 pointer-events-none' : ''}
          />
        </div>

        {/* Date + Recurring on one line */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value, time: '09:00' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className={editingSingle ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecurring: false })}
                className={`cursor-pointer flex-1 py-2 text-sm font-medium transition-colors ${
                  !form.isRecurring
                    ? 'bg-primary text-white'
                    : 'bg-white text-text hover:bg-slate-50'
                }`}
              >
                One-time
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecurring: true })}
                className={`cursor-pointer flex-1 py-2 text-sm font-medium transition-colors ${
                  form.isRecurring
                    ? 'bg-primary text-white'
                    : 'bg-white text-text hover:bg-slate-50'
                }`}
              >
                Recurring
              </button>
            </div>
          </div>
        </div>

        {/* Time + Room on one line */}
        <div className="grid grid-cols-2 gap-3">
          <div className={!dateSelected ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-text mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.time}
              onChange={(v) => setForm({ ...form, time: v })}
              options={availableTimeOptions}
              placeholder={availableTimeOptions.length === 0 ? 'No slots' : 'Select time'}
            />
          </div>
          <div className={!dateSelected || !timeSelected ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-text mb-1">
              Room <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.room}
              onChange={(v) => setForm({ ...form, room: v as Room })}
              options={roomOptions}
              placeholder="Select room"
            />
          </div>
        </div>

        {/* Max Capacity */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Max Capacity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.maxCapacity}
            onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Footer: Delete left, Cancel + Save right */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {editingClass && onDelete && (
            <button
              onClick={onDelete}
              className="cursor-pointer text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Delete Class
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer bg-white text-text border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !isFormValid}
            className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingClass ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
